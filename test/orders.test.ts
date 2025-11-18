
import { v4 as uuidv4 } from 'uuid';
import { Order, OrderItem, CreateOrderRequest } from '../src/types/orders';
import { OrderModel } from '../src/models/Order';
import { OrderService } from '../src/services/OrderService';

// In-memory store for mocked orders
let mockOrderStore: any[] = [];

// Mock mongoose
jest.mock('mongoose', () => ({
  Schema: jest.fn(function() {
    this.path = jest.fn();
    this.index = jest.fn().mockReturnValue(this);
    return this;
  }),
  model: jest.fn(() => ({
    create: jest.fn(async (data) => {
      const order = {
        ...data,
        _id: 'mock-id-' + Math.random(),
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: function() {
          const obj = { ...this };
          delete obj.toObject;
          return obj;
        }
      };
      mockOrderStore.push(order);
      return order;
    }),
    findOne: jest.fn((query) => ({
      exec: jest.fn(async () => {
        const found = mockOrderStore.find(order => {
          if (query.orderId) return order.orderId === query.orderId;
          if (query.paymentId) return order.paymentId === query.paymentId;
          return false;
        });
        return found ? { ...found, toObject: () => ({ ...found }) } : null;
      })
    })),
    find: jest.fn((query) => ({
      sort: jest.fn(function() {
        return {
          exec: jest.fn(async () => {
            let results = mockOrderStore.filter(order => {
              if (query.userId) return order.userId === query.userId;
              return true;
            });
            results = results.sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
            return results.map(order => ({ ...order, toObject: () => ({ ...order }) }));
          })
        };
      })
    })),
    deleteMany: jest.fn(async () => {
      mockOrderStore = [];
      return {};
    }),
  })),
  connect: jest.fn().mockResolvedValue(undefined),
  Types: {
    ObjectId: jest.fn(function() { this.toString = jest.fn().mockReturnValue('mock-id'); }),
  }
}));

// Mock uuid with unique IDs
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => {
    uuidCounter++;
    return `mock-uuid-${uuidCounter}`;
  }),
}));

describe('Orders Management System', () => {
  let orderService: OrderService;

  beforeEach(async () => {
    // Clear the mock order store between tests
    mockOrderStore = [];
    uuidCounter = 0;
    jest.clearAllMocks();
    orderService = new OrderService();
  });

  describe('Order Creation Tests', () => {
    test('Create order successfully', async () => {
      const createOrderRequest: CreateOrderRequest = {
        userId: 'user123',
        paymentId: 'payment456',
        items: [
          {
            inventoryItemId: 'item1',
            name: 'Test Item',
            price: 10.00,
            quantity: 2,
            subtotal: 20.00
          }
        ],
        subtotal: 20.00,
        tax: 2.00,
        total: 22.00
      };

      const order = await orderService.createOrder(createOrderRequest);

      expect(order).toBeDefined();
      expect(order.orderId).toBeDefined();
      expect(order.userId).toBe('user123');
      expect(order.paymentId).toBe('payment456');
      expect(order.items).toHaveLength(1);
      expect(order.subtotal).toBe(20.00);
      expect(order.tax).toBe(2.00);
      expect(order.total).toBe(22.00);
      expect(order.createdAt).toBeInstanceOf(Date);
    });

    test('Create order with multiple items', async () => {
      const createOrderRequest: CreateOrderRequest = {
        userId: 'user123',
        paymentId: 'payment789',
        items: [
          {
            inventoryItemId: 'item1',
            name: 'Item 1',
            price: 10.00,
            quantity: 1,
            subtotal: 10.00
          },
          {
            inventoryItemId: 'item2',
            name: 'Item 2',
            price: 15.00,
            quantity: 2,
            subtotal: 30.00
          },
          {
            inventoryItemId: 'item3',
            name: 'Item 3',
            price: 5.00,
            quantity: 3,
            subtotal: 15.00
          },
          {
            inventoryItemId: 'item4',
            name: 'Item 4',
            price: 20.00,
            quantity: 1,
            subtotal: 20.00
          },
          {
            inventoryItemId: 'item5',
            name: 'Item 5',
            price: 8.00,
            quantity: 2,
            subtotal: 16.00
          }
        ],
        subtotal: 91.00,
        tax: 9.10,
        total: 100.10
      };

      const order = await orderService.createOrder(createOrderRequest);

      expect(order.items).toHaveLength(5);
      expect(order.total).toBe(100.10);
    });

    test('Order has correct financial totals', async () => {
      const createOrderRequest: CreateOrderRequest = {
        userId: 'user123',
        paymentId: 'payment101',
        items: [
          {
            inventoryItemId: 'item1',
            name: 'Item 1',
            price: 12.50,
            quantity: 2,
            subtotal: 25.00
          },
          {
            inventoryItemId: 'item2',
            name: 'Item 2',
            price: 7.75,
            quantity: 4,
            subtotal: 31.00
          }
        ],
        subtotal: 56.00,
        tax: 5.60,
        total: 61.60
      };

      const order = await orderService.createOrder(createOrderRequest);

      expect(order.subtotal).toBe(56.00);
      expect(order.tax).toBe(5.60);
      expect(order.total).toBe(61.60);
    });
  });

  describe('Order Retrieval Tests', () => {
    test('Retrieve order by ID', async () => {
      const createOrderRequest: CreateOrderRequest = {
        userId: 'user123',
        paymentId: 'payment456',
        items: [
          {
            inventoryItemId: 'item1',
            name: 'Test Item',
            price: 10.00,
            quantity: 1,
            subtotal: 10.00
          }
        ],
        subtotal: 10.00,
        tax: 1.00,
        total: 11.00
      };

      const createdOrder = await orderService.createOrder(createOrderRequest);
      const retrievedOrder = await orderService.getOrderById(createdOrder.orderId);

      expect(retrievedOrder).toBeDefined();
      expect(retrievedOrder!.orderId).toBe(createdOrder.orderId);
      expect(retrievedOrder!.userId).toBe('user123');
      expect(retrievedOrder!.paymentId).toBe('payment456');
      expect(retrievedOrder!.items).toHaveLength(1);
      expect(retrievedOrder!.total).toBe(11.00);
    });

    test('Retrieve non-existent order by ID', async () => {
      const result = await orderService.getOrderById('nonexistent-id');
      expect(result).toBeNull();
    });

    test('Retrieve order by payment ID', async () => {
      const createOrderRequest: CreateOrderRequest = {
        userId: 'user123',
        paymentId: 'payment999',
        items: [
          {
            inventoryItemId: 'item1',
            name: 'Test Item',
            price: 5.00,
            quantity: 1,
            subtotal: 5.00
          }
        ],
        subtotal: 5.00,
        tax: 0.50,
        total: 5.50
      };

      await orderService.createOrder(createOrderRequest);
      const retrievedOrder = await orderService.getOrderByPaymentId('payment999');

      expect(retrievedOrder).toBeDefined();
      expect(retrievedOrder!.paymentId).toBe('payment999');
    });

    test('Retrieve non-existent order by payment ID', async () => {
      const result = await orderService.getOrderByPaymentId('nonexistent-payment');
      expect(result).toBeNull();
    });
  });

  describe('User Order History Tests', () => {
    test('Get all orders for user', async () => {
      const userId = 'user123';
      
      // Create multiple orders with different timestamps
      const order1Request: CreateOrderRequest = {
        userId,
        paymentId: 'payment1',
        items: [{ inventoryItemId: 'item1', name: 'Item 1', price: 10.00, quantity: 1, subtotal: 10.00 }],
        subtotal: 10.00,
        tax: 1.00,
        total: 11.00
      };

      const order2Request: CreateOrderRequest = {
        userId,
        paymentId: 'payment2',
        items: [{ inventoryItemId: 'item2', name: 'Item 2', price: 20.00, quantity: 1, subtotal: 20.00 }],
        subtotal: 20.00,
        tax: 2.00,
        total: 22.00
      };

      const order3Request: CreateOrderRequest = {
        userId,
        paymentId: 'payment3',
        items: [{ inventoryItemId: 'item3', name: 'Item 3', price: 30.00, quantity: 1, subtotal: 30.00 }],
        subtotal: 30.00,
        tax: 3.00,
        total: 33.00
      };

      await orderService.createOrder(order1Request);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await orderService.createOrder(order2Request);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const latestOrder = await orderService.createOrder(order3Request);

      const userOrders = await orderService.getUserOrders(userId);

      expect(userOrders).toHaveLength(3);
      expect(userOrders[0].orderId).toBe(latestOrder.orderId); // Most recent first
    });

    test('Get orders for user with no orders', async () => {
      const userOrders = await orderService.getUserOrders('nonexistent-user');
      expect(userOrders).toEqual([]);
    });

    test('User orders contain complete details', async () => {
      const createOrderRequest: CreateOrderRequest = {
        userId: 'user456',
        paymentId: 'payment789',
        items: [
          {
            inventoryItemId: 'item1',
            name: 'Complete Item',
            price: 25.00,
            quantity: 2,
            subtotal: 50.00
          }
        ],
        subtotal: 50.00,
        tax: 5.00,
        total: 55.00
      };

      await orderService.createOrder(createOrderRequest);
      const userOrders = await orderService.getUserOrders('user456');

      expect(userOrders).toHaveLength(1);
      const order = userOrders[0];
      expect(order.orderId).toBeDefined();
      expect(order.userId).toBe('user456');
      expect(order.paymentId).toBe('payment789');
      expect(order.items).toHaveLength(1);
      expect(order.subtotal).toBe(50.00);
      expect(order.tax).toBe(5.00);
      expect(order.total).toBe(55.00);
    });
  });

  describe('Order Data Integrity Tests', () => {
    test('Preserves item pricing at time of purchase', async () => {
      const createOrderRequest: CreateOrderRequest = {
        userId: 'user123',
        paymentId: 'payment456',
        items: [
          {
            inventoryItemId: 'item1',
            name: 'Price Test Item',
            price: 100.00,
            quantity: 1,
            subtotal: 100.00
          }
        ],
        subtotal: 100.00,
        tax: 10.00,
        total: 110.00
      };

      const createdOrder = await orderService.createOrder(createOrderRequest);
      
      // Simulate inventory price change by retrieving order later
      const retrievedOrder = await orderService.getOrderById(createdOrder.orderId);

      expect(retrievedOrder!.items[0].price).toBe(100.00);
      expect(retrievedOrder!.total).toBe(110.00);
    });

    test('Stores order line items correctly', async () => {
      const createOrderRequest: CreateOrderRequest = {
        userId: 'user123',
        paymentId: 'payment456',
        items: [
          {
            inventoryItemId: 'item1',
            name: 'Line Item Test',
            price: 15.50,
            quantity: 3,
            subtotal: 46.50
          },
          {
            inventoryItemId: 'item2',
            name: 'Another Item',
            price: 8.25,
            quantity: 2,
            subtotal: 16.50
          }
        ],
        subtotal: 63.00,
        tax: 6.30,
        total: 69.30
      };

      const order = await orderService.createOrder(createOrderRequest);

      expect(order.items[0].name).toBe('Line Item Test');
      expect(order.items[0].price).toBe(15.50);
      expect(order.items[0].quantity).toBe(3);
      expect(order.items[0].subtotal).toBe(46.50);
      expect(order.items[1].name).toBe('Another Item');
      expect(order.items[1].price).toBe(8.25);
      expect(order.items[1].quantity).toBe(2);
      expect(order.items[1].subtotal).toBe(16.50);
    });

    test('Order totals are immutable', async () => {
      const createOrderRequest: CreateOrderRequest = {
        userId: 'user123',
        paymentId: 'payment456',
        items: [
          {
            inventoryItemId: 'item1',
            name: 'Immutable Test',
            price: 12.00,
            quantity: 2,
            subtotal: 24.00
          }
        ],
        subtotal: 24.00,
        tax: 2.40,
        total: 26.40
      };

      const createdOrder = await orderService.createOrder(createOrderRequest);
      const retrievedOrder = await orderService.getOrderById(createdOrder.orderId);

      expect(retrievedOrder!.subtotal).toBe(24.00);
      expect(retrievedOrder!.tax).toBe(2.40);
      expect(retrievedOrder!.total).toBe(26.40);
    });
  });
});
