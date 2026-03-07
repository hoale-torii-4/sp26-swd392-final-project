/**
 * DTOs & Response Helpers - Tương đương MasterDTOs.cs
 * Node.js dùng plain objects, nhưng ta tạo helpers để format response
 */

// ========== API Response ==========
export class ApiResponse {
  constructor(success, message, data = null, errors = []) {
    this.Success = success;
    this.Message = message;
    this.Data = data;
    this.Errors = errors;
    this.Timestamp = new Date().toISOString();
  }

  static success(data, message = '') {
    return new ApiResponse(true, message, data);
  }

  static error(message, errors = []) {
    return new ApiResponse(false, message, null, errors);
  }
}

// ========== Paged Response ==========
export class PagedResponse {
  constructor(data, totalItems, page, pageSize) {
    this.Data = data;
    this.TotalItems = totalItems;
    this.Page = page;
    this.PageSize = pageSize;
    this.TotalPages = Math.ceil(totalItems / pageSize);
  }
}

// ========== Validation Helpers ==========
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validateRegisterDto(dto) {
  const errors = [];
  if (!dto.Email || !isValidEmail(dto.Email)) errors.push('Valid email is required');
  if (!dto.Password || dto.Password.length < 6) errors.push('Password must be at least 6 characters');
  if (!dto.FullName) errors.push('Full name is required');
  return errors;
}

export function validateLoginDto(dto) {
  const errors = [];
  if (!dto.Email || !isValidEmail(dto.Email)) errors.push('Valid email is required');
  if (!dto.Password) errors.push('Password is required');
  return errors;
}

export function validateCreateOrderB2CDto(dto) {
  const errors = [];
  if (!dto.CustomerName) errors.push('Customer name is required');
  if (!dto.CustomerEmail || !isValidEmail(dto.CustomerEmail)) errors.push('Valid email is required');
  if (!dto.CustomerPhone) errors.push('Customer phone is required');
  if (!dto.Items || dto.Items.length === 0) errors.push('At least one item is required');
  if (!dto.ReceiverName) errors.push('Receiver name is required');
  if (!dto.ReceiverPhone) errors.push('Receiver phone is required');
  if (!dto.DeliveryAddress) errors.push('Delivery address is required');
  if (!dto.DeliveryDate) errors.push('Delivery date is required');
  return errors;
}

export function validateCreateOrderB2BDto(dto) {
  const errors = [];
  if (!dto.UserId) errors.push('B2B requires login - UserId is required');
  if (!dto.CustomerName) errors.push('Customer name is required');
  if (!dto.CustomerEmail || !isValidEmail(dto.CustomerEmail)) errors.push('Valid email is required');
  if (!dto.CustomerPhone) errors.push('Customer phone is required');
  if (!dto.Items || dto.Items.length === 0) errors.push('At least one item is required');
  if (!dto.DeliveryAllocations || dto.DeliveryAllocations.length === 0)
    errors.push('At least one delivery address is required for B2B');
  if (!dto.DeliveryDate) errors.push('Delivery date is required');
  return errors;
}
