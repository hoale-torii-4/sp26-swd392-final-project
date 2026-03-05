# Backend Code Snapshot (Business-Aligned)

Generated: 2026-03-05
Project: `back-end/ShopHangTet`

## 1) Business flows verified & aligned

### Inventory reservation / anti-oversell
- `Item` model uses:
  - `StockQuantity`
  - `ReservedQuantity`
  - `AvailableQuantity = StockQuantity - ReservedQuantity`
- Order flow:
  1. Create order -> `ReserveInventoryAsync` (reserve only)
  2. Payment confirmed -> `DeductReservedInventoryAsync` (convert reserve to deduct)
  3. Payment timeout/cancel before preparing -> `ReleaseInventoryReservationAsync`
  4. Cancel after preparing/shipping -> restock deducted inventory (`RESTOCK` log)

### Payment timeout + webhook
- SePay webhook endpoint: `/api/payment/webhook`.
- Payment status endpoint: `/api/payment/check-status/{orderCode}`.
- Expiration worker (`OrderExpirationBackgroundService`) now:
  - releases reserved inventory,
  - marks order `CANCELLED` after 10 minutes timeout,
  - updates status history.

### Delivery retry + B2B order aggregation
- `OrderDelivery` supports:
  - `Status`, `RetryCount`, `MaxRetries`, `LastAttemptAt`, `FailureReason`.
- `OrderService` supports:
  - `UpdateDeliveryStatusAsync`
  - `ReshipDeliveryAsync`
  - `AggregateDeliveryStatusAsync`
- Aggregation behavior:
  - all delivered -> `COMPLETED`
  - any shipping/pending -> `SHIPPING`
  - failed + delivered -> `PARTIAL_DELIVERY`
  - all cancelled -> `CANCELLED`
  - failed only -> `DELIVERY_FAILED`

### Role boundary updates
- Product admin endpoints in `ProductsController` are now ADMIN-only:
  - `POST /api/products/gift-boxes`
  - `PUT /api/products/gift-boxes/{id}`
  - `POST /api/products/gift-boxes/calculate-price`

## 2) Mix & Match rules updated (new policy)

`ValidateMixMatchRulesAsync` now validates by **quantity** (not just line count):
- total items: `4..6`
- beverage (drink or alcohol): `>= 1`
- snack (nut + food): `>= 2`
- savory specials (`Khô gà lá chanh`, `Khô bò`, `Chà bông cá hồi`, `Lạp xưởng tươi`): `<= 2`
- if contains `Chivas 21`: total items `<= 4`
- if contains `Chivas 12`: total items `<= 5`

DTO `MixMatchValidationResult` expanded with:
- `TotalItemCount`, `SnackCount`, `SavoryCount`, `HasChivas12`, `HasChivas21`.

## 3) Collection pricing metadata + seed strategy

### Collection metadata seeded
`SeedCollectionsAsync` now seeds and backfills:
- `CoverImage`
- `PricingMultiplier`
- `PackagingFee`

### GiftBox seed pricing (runtime-rule based)
- `SeedGiftBoxesAsync` no longer hardcodes each box price.
- Seed price is calculated from rule:

```text
price = round(sum(itemPrice * quantity) * collection.PricingMultiplier + collection.PackagingFee)
```

- Existing gift boxes are also synchronized:
  - recalculate price from collection rule,
  - backfill `GiftBoxItem.ItemPriceSnapshot`,
  - fix missing images.

## 4) GiftBox item price snapshot improvement

`GiftBoxItem` now includes:
- `ItemPriceSnapshot`

Applied at:
- seed create/update,
- admin create/update gift box,
- order snapshot builder (prefer item snapshot price when present).

## 5) Order status model notes

Current enum supports:
- `PAYMENT_CONFIRMING`
- `PREPARING`
- `SHIPPING`
- `PARTIAL_DELIVERY`
- `DELIVERY_FAILED`
- `COMPLETED`
- `CANCELLED`
- (`PAYMENT_EXPIRED_INTERNAL` still exists in enum for compatibility but expiration flow now uses `CANCELLED`.)

## 6) Verification results

### Build
- Command: `dotnet build` (in `back-end/ShopHangTet`)
- Result: **Succeeded**
- Warnings: 4 existing nullable warnings in `AuthController`.

### Tests
- Command: `dotnet test back-end/ShopHangTet.Tests/ShopHangTet.Tests.csproj`
- Result: **Failed (existing test project issue)**
  - Missing namespace/reference in tests:
    - `ShopHangTet.Interfaces` not found
    - `IDeliverySlotRepository` unresolved in test file
- These failures are pre-existing test project wiring issues, not from runtime API build.

## 7) Files touched in this update

- `ShopHangTet/Services/OrderService.cs`
- `ShopHangTet/Services/OrderExpirationBackgroundService.cs`
- `ShopHangTet/Controllers/PaymentController.cs`
- `ShopHangTet/Controllers/ProductsController.cs`
- `ShopHangTet/Data/SeedData.cs`
- `ShopHangTet/Models/ProductModels.cs`
- `ShopHangTet/Models/SupportModels.cs`
- `ShopHangTet/DTOs/MasterDTOs.cs`
- `back-end/BACKEND_CODE_SNAPSHOT.md`
