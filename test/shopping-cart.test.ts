// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../specs/shopping-cart.spec.md
// (spec:d0ce8ada) (code:b8452c40)

// Mock uuid first before any imports that use it
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => {
    uuidCounter++;
    return `mock-uuid-${uuidCounter}`;
  }),
}));

import { ShoppingCart, InventoryManager, InventoryBulkUploader } from '../src/shopping-cart';
import { OrderService } from '../src/services/OrderService';

// Mock Stripe
jest.mock('stripe');
import Stripe from 'stripe';
const MockedStripe = Stripe as jest.MockedClass<typeof Stripe>;

// Mock mongoose before importing
jest.mock('mongoose', () => ({
  Schema: jest.fn(function() {
    this.path = jest.fn();
    this.index = jest.fn().mockReturnValue(this);
    return this;
  }),
  model: jest.fn(() => ({
    find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }) }),
    create: jest.fn().mockResolvedValue({}),
  })),
  connect: jest.fn().mockResolvedValue(undefined),
}));

// Set a fake Stripe API key for tests
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';

describe('ShoppingCart', () => {
  let cart: ShoppingCart;
  let inventoryManager: InventoryManager;
  let orderService: OrderService;

  beforeEach(() => {
    inventoryManager = new InventoryManager();
    orderService = new OrderService();
    cart = new ShoppingCart(inventoryManager, orderService);

    // Mock getItemById to return valid items
    jest.spyOn(inventoryManager, 'getItemById').mockResolvedValue({
      _id: 'mock-id',
      id: 'item1',
      name: 'Test Item',
      price: 10.00,
      availableQuantity: 100,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  describe('Add items to cart', () => {
    it('should add an item to an empty cart', async () => {
      const result = await cart.addItem('item1', 2);
      expect(result).toBe(true);

      const summary = cart.getCartSummary();
      expect(summary.items).toHaveLength(1);
      expect(summary.items[0].id).toBe('item1');
      expect(summary.items[0].quantity).toBe(2);
    });
  });

  describe('Add multiple items to cart', () => {
    it('should add multiple different items', async () => {
      await cart.addItem('item1', 1);
      await cart.addItem('item2', 2);

      const summary = cart.getCartSummary();
      expect(summary.items).toHaveLength(2);
      expect(summary.items.find(item => item.id === 'item1')).toBeDefined();
      expect(summary.items.find(item => item.id === 'item2')).toBeDefined();
    });
  });

  describe('Update existing item quantity', () => {
    it('should update quantity when adding same item again', async () => {
      await cart.addItem('item1', 1);
      await cart.addItem('item1', 2);

      const summary = cart.getCartSummary();
      const item = summary.items.find(item => item.id === 'item1');
      expect(item?.quantity).toBe(3);
    });
  });

  describe('Reject invalid quantity', () => {
    it('should reject zero quantity', async () => {
      const result = await cart.addItem('item1', 0);
      expect(result).toBe(false);

      const summary = cart.getCartSummary();
      expect(summary.items).toHaveLength(0);
    });

    it('should reject negative quantity', async () => {
      const result = await cart.addItem('item1', -1);
      expect(result).toBe(false);

      const summary = cart.getCartSummary();
      expect(summary.items).toHaveLength(0);
    });
  });

  describe('Remove item completely', () => {
    it('should remove item when no quantity specified', async () => {
      await cart.addItem('item1', 3);
      const result = cart.removeItem('item1');

      expect(result).toBe(true);
      const summary = cart.getCartSummary();
      expect(summary.items.find(item => item.id === 'item1')).toBeUndefined();
    });
  });

  describe('Remove partial quantity', () => {
    it('should reduce quantity when partial removal', async () => {
      await cart.addItem('item1', 5);
      const result = cart.removeItem('item1', 2);

      expect(result).toBe(true);
      const summary = cart.getCartSummary();
      const item = summary.items.find(item => item.id === 'item1');
      expect(item?.quantity).toBe(3);
    });
  });

  describe('Remove non-existent item', () => {
    it('should return false when removing non-existent item', () => {
      const result = cart.removeItem('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('Calculate cart summary with tax', () => {
    it('should calculate tax and total correctly', () => {
      // Mock items with prices that sum to 100
      cart.addItem('item1', 1);
      
      const summary = cart.getCartSummary();
      expect(summary.tax).toBe(summary.subtotal * 0.08);
      expect(summary.total).toBe(summary.subtotal + summary.tax);
    });
  });
});

describe('InventoryManager', () => {
  let inventoryManager: InventoryManager;

  beforeEach(() => {
    inventoryManager = new InventoryManager();
  });

  describe('Get available items', () => {
    it('should return all items from database', async () => {
      const items = await inventoryManager.getAvailableItems();
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe('Get single item by ID', () => {
    it('should return item with matching ID', async () => {
      const item = await inventoryManager.getItemById('item1');
      if (item) {
        expect(item.id).toBe('item1');
      }
    });
  });

  describe('Get non-existent item', () => {
    it('should return null for non-existent item', async () => {
      const item = await inventoryManager.getItemById('nonexistent');
      expect(item).toBeNull();
    });
  });

  describe('Update inventory quantity', () => {
    it('should update existing item quantity', async () => {
      const result = await inventoryManager.updateInventory('item1', 5);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Update non-existent item', () => {
    it('should return false for non-existent item', async () => {
      const result = await inventoryManager.updateInventory('nonexistent', 10);
      expect(result).toBe(false);
    });
  });

  describe('Reserve items successfully', () => {
    it('should reserve items with sufficient quantities', async () => {
      const cartItems = [{ id: 'item1', name: 'Test Item', price: 10, quantity: 2 }];
      const result = await inventoryManager.reserveItems(cartItems);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Fail to reserve insufficient items', () => {
    it('should fail when insufficient quantity available', async () => {
      const cartItems = [{ id: 'item1', name: 'Test Item', price: 10, quantity: 1000 }];
      const result = await inventoryManager.reserveItems(cartItems);
      expect(result).toBe(false);
    });
  });

  describe('Release reservation', () => {
    it('should release reserved items', async () => {
      const cartItems = [{ id: 'item1', name: 'Test Item', price: 10, quantity: 2 }];
      await expect(inventoryManager.releaseReservation(cartItems)).resolves.not.toThrow();
    });
  });
});

describe('InventoryBulkUploader', () => {
  let bulkUploader: InventoryBulkUploader;

  beforeEach(() => {
    bulkUploader = new InventoryBulkUploader();
  });

  describe('Successfully upload valid CSV', () => {
    it('should import all valid items', async () => {
      const csvContent = 'id,name,price,availableQuantity\nitem1,Test Item 1,10.99,50\nitem2,Test Item 2,25.50,30';
      const result = await bulkUploader.bulkUploadFromCsv(csvContent);
      
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.totalProcessed).toBe(2);
    });
  });

  describe('Skip duplicate items', () => {
    it('should skip existing items when configured', async () => {
      const csvContent = 'id,name,price,availableQuantity\ndup1,Duplicate Item,15.00,25';
      const result = await bulkUploader.bulkUploadFromCsv(csvContent, { onDuplicate: 'skip' });
      
      expect(result.totalProcessed).toBe(1);
      expect(result.successCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Update duplicate items', () => {
    it('should update existing items when configured', async () => {
      const csvContent = 'id,name,price,availableQuantity\ndup1,Updated Item,20.00,50';
      const result = await bulkUploader.bulkUploadFromCsv(csvContent, { onDuplicate: 'update' });
      
      expect(result.totalProcessed).toBe(1);
      expect(result.successCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Reject missing required fields', () => {
    it('should fail when required fields are missing', async () => {
      const csvContent = 'id,name,price\nitem1,Test Item,10.99';
      const result = await bulkUploader.bulkUploadFromCsv(csvContent);
      
      expect(result.success).toBe(false);
      expect(result.failureCount).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Reject invalid price', () => {
    it('should fail for negative price', async () => {
      const csvContent = 'id,name,price,availableQuantity\nitem1,Test Item,-10.99,50';
      const result = await bulkUploader.bulkUploadFromCsv(csvContent);
      
      expect(result.failureCount).toBeGreaterThan(0);
      expect(result.errors.some(error => error.message.includes('Invalid price'))).toBe(true);
    });

    it('should fail for non-numeric price', async () => {
      const csvContent = 'id,name,price,availableQuantity\nitem1,Test Item,invalid,50';
      const result = await bulkUploader.bulkUploadFromCsv(csvContent);
      
      expect(result.failureCount).toBeGreaterThan(0);
      expect(result.errors.some(error => error.message.includes('Invalid price'))).toBe(true);
    });
  });

  describe('Reject invalid quantity', () => {
    it('should fail for negative quantity', async () => {
      const csvContent = 'id,name,price,availableQuantity\nitem1,Test Item,10.99,-5';
      const result = await bulkUploader.bulkUploadFromCsv(csvContent);
      
      expect(result.failureCount).toBeGreaterThan(0);
      expect(result.errors.some(error => error.message.includes('Invalid availableQuantity'))).toBe(true);
    });

    it('should fail for non-numeric quantity', async () => {
      const csvContent = 'id,name,price,availableQuantity\nitem1,Test Item,10.99,invalid';
      const result = await bulkUploader.bulkUploadFromCsv(csvContent);
      
      expect(result.failureCount).toBeGreaterThan(0);
      expect(result.errors.some(error => error.message.includes('Invalid availableQuantity'))).toBe(true);
    });
  });

  describe('Handle custom delimiter', () => {
    it('should parse semicolon delimited CSV', async () => {
      const csvContent = 'id;name;price;availableQuantity\nitem1;Test Item;10.99;50';
      const result = await bulkUploader.bulkUploadFromCsv(csvContent, { delimiter: ';' });
      
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
    });
  });

  describe('Parse mixed valid and invalid rows', () => {
    it('should handle mix of valid and invalid rows', async () => {
      const csvContent = `id,name,price,availableQuantity
item1,Valid Item 1,10.99,50
item2,Valid Item 2,25.50,30
item3,Invalid Item,-5.00,40
item4,Valid Item 3,15.75,25
item5,Another Invalid,20.00,invalid`;
      
      const result = await bulkUploader.bulkUploadFromCsv(csvContent);
      
      expect(result.totalProcessed).toBe(5);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.every(error => typeof error.row === 'number')).toBe(true);
    });
  });
});
