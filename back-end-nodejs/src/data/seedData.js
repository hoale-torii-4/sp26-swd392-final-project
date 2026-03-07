import { Collection, Tag, Item, GiftBox, DeliverySlot, ItemCategory } from '../models/index.js';

/**
 * SeedData - Tương đương SeedData.cs
 */
export async function seedDatabase() {
  try {
    await seedTags();
    await seedCollections();
    await seedItems();
    await seedGiftBoxes();
    await seedDeliverySlots();
    console.log('----> Seed du lieu thanh cong: Tags, Collections, Items, GiftBoxes, DeliverySlots');
  } catch (error) {
    console.error(`Seed error: ${error.message}`);
    console.error(`Stack trace: ${error.stack}`);
    throw error;
  }
}

async function seedTags() {
  if ((await Tag.countDocuments()) > 0) return;

  const tags = [
    { name: 'Gia đình', type: 'RECIPIENT', isActive: true },
    { name: 'Bạn bè', type: 'RECIPIENT', isActive: true },
    { name: 'Đối tác', type: 'RECIPIENT', isActive: true },
    { name: 'Nhân viên', type: 'RECIPIENT', isActive: true },
    { name: 'Người lớn tuổi', type: 'RECIPIENT', isActive: true },
    { name: 'Doanh nghiệp', type: 'RECIPIENT', isActive: true },

    { name: 'Sum vầy', type: 'MEANING', isActive: true },
    { name: 'Tri ân', type: 'MEANING', isActive: true },
    { name: 'Mừng năm mới', type: 'MEANING', isActive: true },
    { name: 'Chúc sức khỏe', type: 'MEANING', isActive: true },
    { name: 'Chúc tài lộc', type: 'MEANING', isActive: true },
    { name: 'Chúc thành công', type: 'MEANING', isActive: true },

    { name: 'Tết Nguyên Đán', type: 'OCCASION', isActive: true },
  ];

  await Tag.insertMany(tags);
}

async function seedCollections() {
  if ((await Collection.countDocuments()) > 0) return;

  const collections = [
    {
      name: 'Xuân Đoàn Viên',
      description: 'Bộ sưu tập quà Tết truyền thống, ấm áp cho gia đình',
      displayOrder: 1,
      isActive: true,
    },
    {
      name: 'Cát Tường Phú Quý',
      description: 'Bộ sưu tập quà Tết cao cấp, sang trọng',
      displayOrder: 2,
      isActive: true,
    },
    {
      name: 'Lộc Xuân Doanh Nghiệp',
      description: 'Bộ sưu tập quà Tết dành cho doanh nghiệp',
      displayOrder: 3,
      isActive: true,
    },
    {
      name: 'An Nhiên Tân Xuân',
      description: 'Bộ sưu tập quà Tết sức khỏe, tinh tế',
      displayOrder: 4,
      isActive: true,
    },
    {
      name: 'Xuân Gắn Kết',
      description: 'Bộ sưu tập quà Tết nhẹ nhàng, thân tình',
      displayOrder: 5,
      isActive: true,
    },
  ];

  await Collection.insertMany(collections);
}

async function seedItems() {
  if ((await Item.countDocuments()) > 0) return;

  const items = [
    // NHOM HAT - DINH DUONG (10)
    { name: 'Hạt điều rang muối', category: ItemCategory.NUT, price: 85000, stockQuantity: 1000, isActive: true },
    { name: 'Hạt macca', category: ItemCategory.NUT, price: 160000, stockQuantity: 1000, isActive: true },
    { name: 'Hạt hạnh nhân', category: ItemCategory.NUT, price: 130000, stockQuantity: 1000, isActive: true },
    { name: 'Hạt óc chó', category: ItemCategory.NUT, price: 140000, stockQuantity: 1000, isActive: true },
    { name: 'Hạt dẻ cười', category: ItemCategory.NUT, price: 150000, stockQuantity: 1000, isActive: true },
    { name: 'Đậu phộng rang', category: ItemCategory.NUT, price: 45000, stockQuantity: 1000, isActive: true },
    { name: 'Hạt hướng dương', category: ItemCategory.NUT, price: 55000, stockQuantity: 1000, isActive: true },
    { name: 'Hạt bí xanh', category: ItemCategory.NUT, price: 95000, stockQuantity: 1000, isActive: true },
    { name: 'Hạt điều wasabi', category: ItemCategory.NUT, price: 110000, stockQuantity: 1000, isActive: true },
    { name: 'Hạt mix cao cấp', category: ItemCategory.NUT, price: 180000, stockQuantity: 1000, isActive: true },

    // NHOM BANH - KEO (12)
    { name: 'Butter cookies', category: ItemCategory.FOOD, price: 90000, stockQuantity: 1000, isActive: true },
    { name: 'Bánh quy bơ Đan Mạch', category: ItemCategory.FOOD, price: 150000, stockQuantity: 1000, isActive: true },
    { name: 'Socola Jinkeli', category: ItemCategory.FOOD, price: 120000, stockQuantity: 1000, isActive: true },
    { name: 'Socola Ferrero', category: ItemCategory.FOOD, price: 180000, stockQuantity: 1000, isActive: true },
    { name: 'Kẹo tiramisu', category: ItemCategory.FOOD, price: 95000, stockQuantity: 1000, isActive: true },
    { name: 'Kẹo nougat', category: ItemCategory.FOOD, price: 120000, stockQuantity: 1000, isActive: true },
    { name: 'Bánh pía mini', category: ItemCategory.FOOD, price: 85000, stockQuantity: 1000, isActive: true },
    { name: 'Bánh quy yến mạch', category: ItemCategory.FOOD, price: 110000, stockQuantity: 1000, isActive: true },
    { name: 'Socola đen 70%', category: ItemCategory.FOOD, price: 140000, stockQuantity: 1000, isActive: true },
    { name: 'Kẹo trái cây mềm', category: ItemCategory.FOOD, price: 85000, stockQuantity: 1000, isActive: true },
    { name: 'Kẹo caramel', category: ItemCategory.FOOD, price: 100000, stockQuantity: 1000, isActive: true },
    { name: 'Bánh hạnh nhân lát', category: ItemCategory.FOOD, price: 130000, stockQuantity: 1000, isActive: true },

    // NHOM MUT - TRAI CAY SAY (10)
    { name: 'Mứt xoài', category: ItemCategory.FOOD, price: 85000, stockQuantity: 1000, isActive: true },
    { name: 'Mứt dừa', category: ItemCategory.FOOD, price: 75000, stockQuantity: 1000, isActive: true },
    { name: 'Mứt gừng', category: ItemCategory.FOOD, price: 80000, stockQuantity: 1000, isActive: true },
    { name: 'Mứt dứa', category: ItemCategory.FOOD, price: 70000, stockQuantity: 1000, isActive: true },
    { name: 'Nho khô', category: ItemCategory.FOOD, price: 95000, stockQuantity: 1000, isActive: true },
    { name: 'Táo đỏ', category: ItemCategory.FOOD, price: 110000, stockQuantity: 1000, isActive: true },
    { name: 'Mứt me', category: ItemCategory.FOOD, price: 75000, stockQuantity: 1000, isActive: true },
    { name: 'Mứt cam', category: ItemCategory.FOOD, price: 90000, stockQuantity: 1000, isActive: true },
    { name: 'Mận sấy', category: ItemCategory.FOOD, price: 120000, stockQuantity: 1000, isActive: true },
    { name: 'Dứa sấy dẻo', category: ItemCategory.FOOD, price: 85000, stockQuantity: 1000, isActive: true },

    // NHOM TRA (8)
    { name: 'Trà ô long', category: ItemCategory.DRINK, price: 120000, stockQuantity: 1000, isActive: true },
    { name: 'Trà sen Tây Hồ', category: ItemCategory.DRINK, price: 180000, stockQuantity: 1000, isActive: true },
    { name: 'Trà lài', category: ItemCategory.DRINK, price: 95000, stockQuantity: 1000, isActive: true },
    { name: 'Trà thảo mộc', category: ItemCategory.DRINK, price: 110000, stockQuantity: 1000, isActive: true },
    { name: 'Trà hoa quả', category: ItemCategory.DRINK, price: 100000, stockQuantity: 1000, isActive: true },
    { name: 'Trà gừng mật ong', category: ItemCategory.DRINK, price: 110000, stockQuantity: 1000, isActive: true },
    { name: 'Trà atiso', category: ItemCategory.DRINK, price: 110000, stockQuantity: 1000, isActive: true },
    { name: 'Trà xanh Nhật', category: ItemCategory.DRINK, price: 150000, stockQuantity: 1000, isActive: true },

    // NHOM RUOU (6)
    { name: 'Rượu vang đỏ (Chile/Pháp entry)', category: ItemCategory.ALCOHOL, price: 320000, stockQuantity: 500, isAlcohol: true, isActive: true },
    { name: 'Rượu Batise', category: ItemCategory.ALCOHOL, price: 280000, stockQuantity: 500, isAlcohol: true, isActive: true },
    { name: 'Rượu Chivas 12', category: ItemCategory.ALCOHOL, price: 750000, stockQuantity: 300, isAlcohol: true, isActive: true },
    { name: 'Rượu Chivas 21', category: ItemCategory.ALCOHOL, price: 2300000, stockQuantity: 200, isAlcohol: true, isActive: true },
    { name: 'Rượu vang trắng', category: ItemCategory.ALCOHOL, price: 300000, stockQuantity: 500, isAlcohol: true, isActive: true },
    { name: 'Rượu sake', category: ItemCategory.ALCOHOL, price: 350000, stockQuantity: 500, isAlcohol: true, isActive: true },

    // NHOM DAC SAN MAN (4)
    { name: 'Khô gà lá chanh', category: ItemCategory.FOOD, price: 120000, stockQuantity: 1000, isActive: true },
    { name: 'Khô bò', category: ItemCategory.FOOD, price: 180000, stockQuantity: 1000, isActive: true },
    { name: 'Chà bông cá hồi', category: ItemCategory.FOOD, price: 210000, stockQuantity: 1000, isActive: true },
    { name: 'Lạp xưởng tươi', category: ItemCategory.FOOD, price: 160000, stockQuantity: 1000, isActive: true },
  ];

  await Item.insertMany(items);
  console.log(`----> Seeded ${items.length} Items`);
}

async function seedGiftBoxes() {
  if ((await GiftBox.countDocuments()) > 0) return;

  const collections = await Collection.find();
  const tags = await Tag.find();
  const items = await Item.find();

  if (!collections.length || !items.length) return;

  const collectionMap = {};
  collections.forEach((c) => (collectionMap[c.name] = c._id.toString()));

  const tagMap = {};
  tags.forEach((t) => (tagMap[t.name] = t._id.toString()));

  const itemMap = {};
  items.forEach((i) => (itemMap[i.name] = i._id.toString()));

  function getCollectionId(name) {
    if (!collectionMap[name]) throw new Error(`Collection not found: ${name}`);
    return collectionMap[name];
  }

  function getItemId(name) {
    if (!itemMap[name]) throw new Error(`Item not found: ${name}`);
    return itemMap[name];
  }

  function getTagIds(...tagNames) {
    return tagNames.map((n) => {
      if (!tagMap[n]) throw new Error(`Tag not found: ${n}`);
      return tagMap[n];
    });
  }

  function createGiftBox(collectionName, boxName, price, recipientTag, meaningTag, ...itemNames) {
    return {
      name: `${collectionName} - ${boxName}`,
      description: `Hộp quà ${boxName} thuộc collection ${collectionName}`,
      price,
      collectionId: getCollectionId(collectionName),
      tags: getTagIds(recipientTag, meaningTag),
      images: ['seed-box.jpg'],
      items: itemNames.map((n) => ({ itemId: getItemId(n), quantity: 1 })),
      isActive: true,
    };
  }

  const giftBoxes = [
    // 1) XUAN DOAN VIEN (8)
    createGiftBox('Xuân Đoàn Viên', 'Gia Ấm', 620000, 'Gia đình', 'Sum vầy', 'Hạt điều rang muối', 'Mứt dừa', 'Butter cookies', 'Trà lài'),
    createGiftBox('Xuân Đoàn Viên', 'Trường Thọ', 760000, 'Người lớn tuổi', 'Chúc sức khỏe', 'Táo đỏ', 'Mứt gừng', 'Trà sen Tây Hồ', 'Bánh pía mini'),
    createGiftBox('Xuân Đoàn Viên', 'Sum Vầy', 790000, 'Bạn bè', 'Mừng năm mới', 'Hạt macca', 'Kẹo tiramisu', 'Nho khô', 'Trà ô long'),
    createGiftBox('Xuân Đoàn Viên', 'Tri Ân', 1050000, 'Đối tác', 'Tri ân', 'Hạt hạnh nhân', 'Socola Jinkeli', 'Trà ô long', 'Rượu Batise'),
    createGiftBox('Xuân Đoàn Viên', 'Đoàn Tụ', 900000, 'Gia đình', 'Mừng năm mới', 'Hạt óc chó', 'Mứt xoài', 'Trà sen Tây Hồ', 'Bánh quy bơ Đan Mạch'),
    createGiftBox('Xuân Đoàn Viên', 'Xuân Hòa', 560000, 'Gia đình', 'Sum vầy', 'Đậu phộng rang', 'Mứt dứa', 'Trà lài', 'Butter cookies'),
    createGiftBox('Xuân Đoàn Viên', 'Ấm Tình', 900000, 'Bạn bè', 'Tri ân', 'Hạt macca', 'Socola Ferrero', 'Trà ô long', 'Nho khô'),
    createGiftBox('Xuân Đoàn Viên', 'Phúc Lộc', 960000, 'Gia đình', 'Chúc tài lộc', 'Hạt điều rang muối', 'Mứt gừng', 'Trà thảo mộc', 'Rượu vang đỏ (Chile/Pháp entry)'),

    // 2) CAT TUONG PHU QUY (9)
    createGiftBox('Cát Tường Phú Quý', 'Doanh Gia', 2150000, 'Đối tác', 'Chúc thành công', 'Rượu Chivas 12', 'Hạt dẻ cười', 'Socola Ferrero', 'Trà ô long'),
    createGiftBox('Cát Tường Phú Quý', 'Thịnh Phát', 4500000, 'Doanh nghiệp', 'Chúc tài lộc', 'Rượu Chivas 21', 'Hạt macca', 'Hạt óc chó', 'Trà sen Tây Hồ'),
    createGiftBox('Cát Tường Phú Quý', 'Tri Ân', 1300000, 'Nhân viên', 'Tri ân', 'Rượu vang đỏ (Chile/Pháp entry)', 'Bánh quy bơ Đan Mạch', 'Mứt xoài', 'Trà lài'),
    createGiftBox('Cát Tường Phú Quý', 'Cao Niên', 980000, 'Người lớn tuổi', 'Chúc sức khỏe', 'Táo đỏ', 'Hạt óc chó', 'Trà thảo mộc', 'Mứt gừng'),
    createGiftBox('Cát Tường Phú Quý', 'Giao Hảo', 1380000, 'Bạn bè', 'Mừng năm mới', 'Rượu vang đỏ (Chile/Pháp entry)', 'Khô bò', 'Hạt điều rang muối', 'Socola Jinkeli'),
    createGiftBox('Cát Tường Phú Quý', 'Vượng Phát', 2200000, 'Đối tác', 'Chúc tài lộc', 'Rượu Chivas 12', 'Hạt óc chó', 'Socola Ferrero', 'Trà sen Tây Hồ'),
    createGiftBox('Cát Tường Phú Quý', 'Kim Ngọc', 1450000, 'Người lớn tuổi', 'Mừng năm mới', 'Rượu vang đỏ (Chile/Pháp entry)', 'Táo đỏ', 'Hạt macca', 'Trà thảo mộc'),
    createGiftBox('Cát Tường Phú Quý', 'Thành Công', 2100000, 'Doanh nghiệp', 'Chúc thành công', 'Rượu Chivas 12', 'Hạt dẻ cười', 'Bánh quy bơ Đan Mạch', 'Trà ô long'),
    createGiftBox('Cát Tường Phú Quý', 'Phúc Quý', 1300000, 'Nhân viên', 'Chúc tài lộc', 'Rượu vang đỏ (Chile/Pháp entry)', 'Socola Jinkeli', 'Hạt điều rang muối', 'Trà lài'),

    // 3) LOC XUAN DOANH NGHIEP (8)
    createGiftBox('Lộc Xuân Doanh Nghiệp', 'Tri Ân', 650000, 'Nhân viên', 'Tri ân', 'Butter cookies', 'Hạt điều rang muối', 'Mứt dứa', 'Trà lài'),
    createGiftBox('Lộc Xuân Doanh Nghiệp', 'Đồng Hành', 1180000, 'Đối tác', 'Chúc thành công', 'Rượu vang đỏ (Chile/Pháp entry)', 'Hạt macca', 'Trà ô long', 'Socola Jinkeli'),
    createGiftBox('Lộc Xuân Doanh Nghiệp', 'Khởi Lộc', 1900000, 'Doanh nghiệp', 'Chúc tài lộc', 'Rượu Chivas 12', 'Hạt dẻ cười', 'Trà sen Tây Hồ', 'Bánh quy bơ Đan Mạch'),
    createGiftBox('Lộc Xuân Doanh Nghiệp', 'Gắn Kết', 720000, 'Bạn bè', 'Tri ân', 'Khô gà lá chanh', 'Hạt điều rang muối', 'Trà ô long', 'Mứt xoài'),
    createGiftBox('Lộc Xuân Doanh Nghiệp', 'Đồng Tâm', 720000, 'Nhân viên', 'Mừng năm mới', 'Butter cookies', 'Hạt macca', 'Mứt dứa', 'Trà lài'),
    createGiftBox('Lộc Xuân Doanh Nghiệp', 'Hợp Tác', 1400000, 'Đối tác', 'Chúc thành công', 'Rượu vang đỏ (Chile/Pháp entry)', 'Hạt hạnh nhân', 'Trà sen Tây Hồ', 'Socola Ferrero'),
    createGiftBox('Lộc Xuân Doanh Nghiệp', 'Khai Xuân', 1650000, 'Doanh nghiệp', 'Chúc tài lộc', 'Rượu Chivas 12', 'Hạt óc chó', 'Trà ô long', 'Bánh pía mini'),
    createGiftBox('Lộc Xuân Doanh Nghiệp', 'Bền Vững', 750000, 'Bạn bè', 'Mừng năm mới', 'Khô gà lá chanh', 'Hạt điều rang muối', 'Trà hoa quả', 'Mứt xoài'),

    // 4) AN NHIEN TAN XUAN (7)
    createGiftBox('An Nhiên Tân Xuân', 'Trường Thọ', 950000, 'Người lớn tuổi', 'Chúc sức khỏe', 'Táo đỏ', 'Hạt óc chó', 'Trà thảo mộc', 'Chà bông cá hồi'),
    createGiftBox('An Nhiên Tân Xuân', 'An Khang', 750000, 'Gia đình', 'Chúc sức khỏe', 'Hạt hạnh nhân', 'Mứt dừa', 'Trà sen Tây Hồ', 'Mứt gừng'),
    createGiftBox('An Nhiên Tân Xuân', 'Thanh Nhã', 650000, 'Bạn bè', 'Mừng năm mới', 'Trà hoa quả', 'Hạt điều rang muối', 'Nho khô', 'Bánh pía mini'),
    createGiftBox('An Nhiên Tân Xuân', 'Bình An', 750000, 'Người lớn tuổi', 'Chúc sức khỏe', 'Táo đỏ', 'Hạt óc chó', 'Trà thảo mộc', 'Mứt gừng'),
    createGiftBox('An Nhiên Tân Xuân', 'Thiện Tâm', 820000, 'Gia đình', 'Tri ân', 'Hạt hạnh nhân', 'Mứt dừa', 'Trà sen Tây Hồ', 'Nho khô'),
    createGiftBox('An Nhiên Tân Xuân', 'Tâm Giao', 750000, 'Bạn bè', 'Tri ân', 'Trà hoa quả', 'Hạt macca', 'Bánh pía mini', 'Mứt xoài'),
    createGiftBox('An Nhiên Tân Xuân', 'An Lành', 950000, 'Người lớn tuổi', 'Mừng năm mới', 'Hạt dẻ cười', 'Táo đỏ', 'Trà thảo mộc', 'Chà bông cá hồi'),

    // 5) XUAN GAN KET (8)
    createGiftBox('Xuân Gắn Kết', 'Chia Sẻ', 650000, 'Bạn bè', 'Tri ân', 'Khô gà lá chanh', 'Hạt điều rang muối', 'Trà lài', 'Mứt dứa'),
    createGiftBox('Xuân Gắn Kết', 'Sum Họp', 900000, 'Gia đình', 'Sum vầy', 'Bánh quy bơ Đan Mạch', 'Mứt xoài', 'Trà ô long', 'Hạt macca'),
    createGiftBox('Xuân Gắn Kết', 'Tri Ân', 1050000, 'Nhân viên', 'Tri ân', 'Rượu vang đỏ (Chile/Pháp entry)', 'Socola Jinkeli', 'Trà lài', 'Hạt hạnh nhân'),
    createGiftBox('Xuân Gắn Kết', 'Thân Giao', 1250000, 'Đối tác', 'Chúc thành công', 'Rượu Batise', 'Hạt dẻ cười', 'Trà ô long', 'Khô bò'),
    createGiftBox('Xuân Gắn Kết', 'Tâm Ý', 650000, 'Nhân viên', 'Mừng năm mới', 'Khô gà lá chanh', 'Hạt điều rang muối', 'Trà lài', 'Mứt dứa'),
    createGiftBox('Xuân Gắn Kết', 'Thân Ái', 900000, 'Gia đình', 'Tri ân', 'Bánh quy bơ Đan Mạch', 'Mứt xoài', 'Trà ô long', 'Hạt hạnh nhân'),
    createGiftBox('Xuân Gắn Kết', 'Hòa Thuận', 1300000, 'Đối tác', 'Chúc tài lộc', 'Rượu Batise', 'Hạt dẻ cười', 'Socola Ferrero', 'Trà sen Tây Hồ'),
    createGiftBox('Xuân Gắn Kết', 'Gắn Bó', 900000, 'Bạn bè', 'Sum vầy', 'Khô bò', 'Hạt macca', 'Trà lài', 'Nho khô'),
  ];

  await GiftBox.insertMany(giftBoxes);
  console.log(`----> Seeded ${giftBoxes.length} GiftBoxes`);
}

async function seedDeliverySlots() {
  if ((await DeliverySlot.countDocuments()) > 0) return;

  const slots = [];
  const startDate = new Date(2026, 0, 20); // January 20, 2026

  for (let day = 0; day < 10; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);

    slots.push({
      deliveryDate: date,
      timeSlot: '8AM-12PM',
      maxOrdersPerSlot: 50,
      currentOrderCount: 0,
      isLocked: false,
    });

    slots.push({
      deliveryDate: date,
      timeSlot: '1PM-5PM',
      maxOrdersPerSlot: 50,
      currentOrderCount: 0,
      isLocked: false,
    });

    slots.push({
      deliveryDate: date,
      timeSlot: '6PM-9PM',
      maxOrdersPerSlot: 30,
      currentOrderCount: 0,
      isLocked: false,
    });
  }

  await DeliverySlot.insertMany(slots);
  console.log(`----> Seeded ${slots.length} DeliverySlots`);
}
