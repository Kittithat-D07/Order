export type OrderStatus = "pending" | "preparing" | "served" | "cancelled";

export type OrderItemStatus = "pending" | "preparing" | "ready" | "served" | "cancelled";

export interface Table {
  id: string;
  table_number: string;
  qr_token: string;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  display_order: number;
  created_at: string;
}

export interface Order {
  id: string;
  table_id: string;
  status: OrderStatus;
  total_amount: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  note: string | null;
  subtotal: number;
  status: OrderItemStatus;
  served_by: string | null;
  served_at: string | null;
}

export interface OrderWithItems extends Order {
  order_items: (OrderItem & { menu_items: MenuItem | null })[];
  tables: Table | null;
  // เพิ่มใน migration 002 (server name + claimed time)
  server_name?: string | null;
  claimed_at?: string | null;
}

// Cart item (client-side)
export interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  note: string;
}

// Bill
export interface Bill {
  id: string;
  order_id: string;
  bill_number: string;
  total_amount: number;
  requested_at: string;
  printed_at: string | null;
  created_at: string;
}
