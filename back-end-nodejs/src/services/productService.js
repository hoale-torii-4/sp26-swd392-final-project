import { Item, GiftBox, Collection, Tag } from '../models/index.js';

/**
 * Product Service - Tương đương ProductService.cs
 */
export class ProductService {
    // ========== Items ==========

    async getItems(name = null) {
        const query = { isActive: true };
        if (name && name.trim()) {
            query.name = { $regex: name.trim(), $options: 'i' };
        }
        return Item.find(query);
    }

    async getItemById(id) {
        return Item.findOne({ _id: id, isActive: true });
    }

    // ========== Gift Boxes ==========

    async getGiftBoxes(name = null) {
        const query = { isActive: true };
        if (name && name.trim()) {
            query.name = { $regex: name.trim(), $options: 'i' };
        }

        const giftBoxes = await GiftBox.find(query);

        // Batch load collections
        const collectionIds = [...new Set(giftBoxes.map((x) => x.collectionId))];
        const collections = await Collection.find({ _id: { $in: collectionIds }, isActive: true });
        const collectionMap = {};
        collections.forEach((c) => (collectionMap[c._id.toString()] = c.name));

        // Batch load items
        const itemIds = [...new Set(giftBoxes.flatMap((x) => x.items.map((i) => i.itemId)))];
        const items = await Item.find({ _id: { $in: itemIds }, isActive: true });
        const itemMap = {};
        items.forEach((i) => (itemMap[i._id.toString()] = i));

        // Batch load tags
        const tagIds = [...new Set(giftBoxes.flatMap((x) => x.tags))];
        const tags = await Tag.find({ _id: { $in: tagIds }, isActive: true });
        const tagMap = {};
        tags.forEach((t) => (tagMap[t._id.toString()] = t.name));

        return giftBoxes.map((x) => ({
            Id: x._id.toString(),
            Name: x.name,
            Description: x.description,
            Price: x.price,
            Image: x.images?.[0] || null,
            Collection: collectionMap[x.collectionId] || '',
            Tags: x.tags
                .map((tagId) => tagMap[tagId] || '')
                .filter((t) => t),
            Items: x.items.map((gi) => {
                const item = itemMap[gi.itemId];
                return {
                    Id: gi.itemId,
                    Name: item?.name || '',
                    Price: gi.itemPriceSnapshot > 0 ? gi.itemPriceSnapshot : item?.price || 0,
                    Image: item?.images?.[0] || null,
                    Quantity: gi.quantity,
                };
            }),
            IsActive: x.isActive,
            CreatedAt: x.createdAt,
        }));
    }

    async getGiftBoxDetailById(id) {
        const giftBox = await GiftBox.findOne({ _id: id, isActive: true });
        if (!giftBox) return null;

        // Load item details
        const itemIds = giftBox.items.map((i) => i.itemId);
        const items = await Item.find({ _id: { $in: itemIds }, isActive: true });
        const itemMap = {};
        items.forEach((i) => (itemMap[i._id.toString()] = i));

        // Load collection
        const collection = await Collection.findOne({ _id: giftBox.collectionId, isActive: true });

        // Load tags
        const tagIds = [...new Set(giftBox.tags)];
        const tags = await Tag.find({ _id: { $in: tagIds }, isActive: true });
        const tagMap = {};
        tags.forEach((t) => (tagMap[t._id.toString()] = t.name));

        return {
            Id: giftBox._id.toString(),
            Name: giftBox.name,
            Description: giftBox.description,
            Price: giftBox.price,
            Image: giftBox.images?.[0] || null,
            Images: giftBox.images || [],
            Collection: collection?.name || '',
            Tags: giftBox.tags
                .map((tagId) => tagMap[tagId] || '')
                .filter((t) => t),
            Items: giftBox.items.map((gi) => {
                const item = itemMap[gi.itemId];
                return {
                    Id: gi.itemId,
                    Name: item?.name || '',
                    Price: gi.itemPriceSnapshot > 0 ? gi.itemPriceSnapshot : item?.price || 0,
                    Image: item?.images?.[0] || null,
                    Quantity: gi.quantity,
                };
            }),
            IsActive: giftBox.isActive,
            CreatedAt: giftBox.createdAt,
        };
    }

    // ========== Collections ==========

    async getCollections(name = null) {
        const query = { isActive: true };
        if (name && name.trim()) {
            query.name = { $regex: name.trim(), $options: 'i' };
        }

        const collections = await Collection.find(query).sort({ displayOrder: 1 });

        const collectionIds = collections.map((c) => c._id.toString());
        const giftBoxes = await GiftBox.find({
            isActive: true,
            collectionId: { $in: collectionIds },
        });

        return collections.map((c) => ({
            Id: c._id.toString(),
            Name: c.name,
            Description: c.description,
            CoverImage: c.coverImage,
            PricingMultiplier: c.pricingMultiplier,
            PackagingFee: c.packagingFee,
            DisplayOrder: c.displayOrder,
            IsActive: c.isActive,
            CreatedAt: c.createdAt,
            GiftBoxCount: giftBoxes.filter((gb) => gb.collectionId === c._id.toString()).length,
        }));
    }

    async getCollectionDetailById(id) {
        const collection = await Collection.findOne({ _id: id, isActive: true });
        if (!collection) return null;

        const giftBoxes = await GiftBox.find({ collectionId: id, isActive: true });

        return {
            Id: collection._id.toString(),
            Name: collection.name,
            Description: collection.description,
            CoverImage: collection.coverImage,
            PricingMultiplier: collection.pricingMultiplier,
            PackagingFee: collection.packagingFee,
            DisplayOrder: collection.displayOrder,
            IsActive: collection.isActive,
            CreatedAt: collection.createdAt,
            GiftBoxes: giftBoxes.map((x) => ({
                Id: x._id.toString(),
                Name: x.name,
                Description: x.description,
                Price: x.price,
                Image: x.images?.[0] || null,
                Collection: collection.name,
                Tags: [],
                Items: [],
                IsActive: x.isActive,
                CreatedAt: x.createdAt,
            })),
        };
    }

    // ========== GiftBox Pricing ==========

    /**
     * Tính giá GiftBox tự động: (sum item cost × multiplier) + packagingFee
     */
    async calculateGiftBoxPrice(collectionId, items) {
        const collection = await Collection.findById(collectionId);
        if (!collection) throw new Error('Collection not found');

        const itemIds = [...new Set(items.map((x) => x.ItemId || x.itemId))];
        const dbItems = await Item.find({ _id: { $in: itemIds } });
        const itemMap = {};
        dbItems.forEach((i) => (itemMap[i._id.toString()] = i));

        let totalCost = 0;
        for (const giftBoxItem of items) {
            const itemId = giftBoxItem.ItemId || giftBoxItem.itemId;
            const item = itemMap[itemId];
            if (item) {
                totalCost += item.price * (giftBoxItem.Quantity || giftBoxItem.quantity || 0);
            }
        }

        const price = totalCost * collection.pricingMultiplier + collection.packagingFee;
        return Math.round(price);
    }

    // ========== GiftBox CRUD (ADMIN) ==========

    async createGiftBox(dto) {
        const itemIds = [...new Set(dto.Items.map((i) => i.ItemId))];
        const dbItems = await Item.find({ _id: { $in: itemIds } });
        const itemMap = {};
        dbItems.forEach((i) => (itemMap[i._id.toString()] = i));

        const giftBoxItems = dto.Items.map((i) => ({
            itemId: i.ItemId,
            quantity: i.Quantity,
            itemPriceSnapshot: itemMap[i.ItemId]?.price || 0,
        }));

        let price;
        if (dto.PriceOverride && dto.PriceOverride > 0) {
            price = dto.PriceOverride;
        } else {
            price = await this.calculateGiftBoxPrice(dto.CollectionId, giftBoxItems);
        }

        const giftBox = await GiftBox.create({
            name: dto.Name,
            description: dto.Description || '',
            price,
            images: dto.Images || [],
            collectionId: dto.CollectionId,
            tags: dto.Tags || [],
            items: giftBoxItems,
            isActive: true,
        });

        return giftBox;
    }

    async updateGiftBox(id, dto) {
        const giftBox = await GiftBox.findById(id);
        if (!giftBox) throw new Error('GiftBox not found');

        if (dto.Name) giftBox.name = dto.Name;
        if (dto.Description) giftBox.description = dto.Description;
        if (dto.Images) giftBox.images = dto.Images;
        if (dto.CollectionId) giftBox.collectionId = dto.CollectionId;
        if (dto.Tags) giftBox.tags = dto.Tags;
        if (dto.IsActive !== undefined && dto.IsActive !== null) giftBox.isActive = dto.IsActive;

        if (dto.Items) {
            const itemIds = [...new Set(dto.Items.map((i) => i.ItemId))];
            const dbItems = await Item.find({ _id: { $in: itemIds } });
            const itemMap = {};
            dbItems.forEach((i) => (itemMap[i._id.toString()] = i));

            giftBox.items = dto.Items.map((i) => ({
                itemId: i.ItemId,
                quantity: i.Quantity,
                itemPriceSnapshot: itemMap[i.ItemId]?.price || 0,
            }));
        }

        // Recalculate price
        if (dto.PriceOverride && dto.PriceOverride > 0) {
            giftBox.price = dto.PriceOverride;
        } else if (dto.Items || dto.CollectionId) {
            giftBox.price = await this.calculateGiftBoxPrice(giftBox.collectionId, giftBox.items);
        }

        await giftBox.save();
        return giftBox;
    }
}
