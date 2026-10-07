// Localhost default: http://localhost:5000
const BASE = process.env.NEXT_PUBLIC_API_URL || "https://naashyol-backend.onrender.com";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const base = BASE.replace(/\/$/, "");
  const pathNorm = path.startsWith("/") ? path : `/${path}`;
  const url = path.startsWith("http") ? path : `${base}${pathNorm}`;
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers, credentials: "include" });
  } catch (err: any) {
    console.error(`API Connection Error [${url}]:`, err);
    throw new Error(`Unable to connect to server at ${base}. Make sure backend is running.`);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      if (pathNorm.includes("/auth/me")) {
        localStorage.removeItem("token");
      }
    }
    throw new Error(data.message || res.statusText || "Request failed");
  }
  return data as T;
}

// Auth
export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    request<{ _id: string; name: string; email: string; role: string; token: string }>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ _id: string; name: string; email: string; role: string; token: string }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  phoneLogin: (body: { phone: string; password: string }) =>
    request<{ _id: string; name: string; phone?: string; email?: string; role: string; token: string; user?: any }>("/api/auth/phone/login", { method: "POST", body: JSON.stringify(body) }),
  sendRegistrationOTP: (body: { phone: string }) =>
    request<{ message: string; phone: string }>("/api/auth/phone/send-registration-otp", { method: "POST", body: JSON.stringify(body) }),
  verifyRegistrationOTP: (body: { phone: string; otp: string; name: string; email: string; password: string; referralCode?: string }) =>
    request<{ _id?: string; name?: string; phone?: string; email?: string; role?: string; token: string; user?: any }>("/api/auth/phone/verify-registration-otp", { method: "POST", body: JSON.stringify(body) }),
  forgotPasswordWhatsapp: (body: { phone: string }) =>
    request<{ message: string; phone: string }>("/api/auth/phone/forgot-password", { method: "POST", body: JSON.stringify(body) }),
  resetPasswordWhatsapp: (body: { phone: string; otp: string; newPassword: string }) =>
    request<{ message: string }>("/api/auth/phone/reset-password", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<{ _id: string; name: string; email?: string; phone?: string; avatar?: string; role: string; referralCode?: string; walletBalance?: number }>("/api/auth/me"),
  updateMe: (body: { name?: string; email?: string; phone?: string; avatar?: string }) =>
    request<{ _id: string; name: string; email: string; phone?: string; avatar?: string; role: string; referralCode?: string; walletBalance?: number }>("/api/auth/me", { method: "PUT", body: JSON.stringify(body) }),
  deleteAccount: (password: string) =>
    request<{ message: string }>("/api/auth/me", { method: "DELETE", body: JSON.stringify({ password }) }),
};

// Upload
export const uploadApi = {
  uploadBase64: (data: { image: string; folder?: string }) =>
    request<{ url: string; filename: string }>("/api/upload", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Banners
export const bannersApi = {
  list: () => request<{ _id?: string; image: string; title?: string; subtitle?: string; link?: string; linkText?: string; type?: string; position?: string; isActive?: boolean; clicks?: number }[]>("/api/banners"),
  click: (id: string) => request<{ clicks: number }>(`/api/banners/${id}/click`, { method: "POST" }),
};

// Categories (with subcategories and image)
export const categoriesApi = {
  list: async (activeOnly: boolean = true) => {
    const res = await request<any>(`/api/categories${activeOnly ? "?activeOnly=true" : ""}`);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.categories)) return res.categories;
    return [];
  },
};

// Attributes
export const attributesApi = {
  list: (category?: string) => 
    request<any[]>(`/api/attributes${category ? `?category=${category}` : ""}`),
};

// Products
export const productsApi = {
  list: (params?: { search?: string; category?: string; subcategory?: string; brand?: string; minPrice?: number; maxPrice?: number; sort?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.category) sp.set("category", params.category);
    if (params?.subcategory) sp.set("subcategory", params.subcategory);
    if (params?.brand) sp.set("brand", params.brand);
    if (params?.minPrice != null) sp.set("minPrice", String(params.minPrice));
    if (params?.maxPrice != null) sp.set("maxPrice", String(params.maxPrice));
    if (params?.sort) sp.set("sort", params.sort);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.limit) sp.set("limit", String(params.limit));
    const q = sp.toString();
    return request<{ products: any[]; total: number; page: number; limit: number }>(`/api/products${q ? `?${q}` : ""}`);
  },
  byId: (id: string) => request<any>(`/api/products/${id}`),
  featured: (limit?: number) =>
    request<any[]>(`/api/products/featured${limit != null ? `?limit=${limit}` : ""}`),
  offers: (limit?: number) =>
    request<any[]>(`/api/products/offers${limit != null ? `?limit=${limit}` : ""}`),
};

// Cart
export const cartApi = {
  get: () =>
    request<{ items: Array<{ product: any; sku: string; quantity: number; productId: string; variant: any; price: number }>; subtotal: number; count: number }>("/api/cart"),
  add: (productId: string, sku: string, quantity?: number, attributes?: any) =>
    request<{ message: string }>("/api/cart", {
      method: "POST",
      body: JSON.stringify({ productId, sku, quantity: quantity ?? 1, attributes }),
    }),
  update: (productId: string, sku: string, quantity: number) =>
    request<{ message: string }>("/api/cart", {
      method: "PUT",
      body: JSON.stringify({ productId, sku, quantity }),
    }),
  remove: (productId: string, sku: string) =>
    request<{ message: string }>(`/api/cart/${productId}/${sku}`, { method: "DELETE" }),
};

// Vendor Stock
export const vendorStockApi = {
  submit: (body: { productId: string; sku: string; stockQuantity: number; vendorPrice: number }) =>
    request<any>("/api/vendor-stock", { method: "POST", body: JSON.stringify(body) }),
  select: (body: { productId: string; sku: string; vendorId: string }) =>
    request<any>("/api/vendor-stock/select", { method: "PUT", body: JSON.stringify(body) }),
  listForVariant: (productId: string, sku: string) =>
    request<any[]>(`/api/vendor-stock/${productId}/${sku}`),
};

// Referrals
export const referralsApi = {
  apply: (referralCode: string) =>
    request<{ message: string; referrer: string }>("/api/referrals/apply", { method: "POST", body: JSON.stringify({ referralCode }) }),
  stats: () =>
    request<{ referralCode: string; referralCount: number; walletBalance: number; referrals: any[] }>("/api/referrals/stats"),
};

// Reviews
export const reviewsApi = {
  create: (body: { productId: string; rating: number; comment: string; title?: string; images?: string[] }) =>
    request<any>("/api/reviews", { method: "POST", body: JSON.stringify(body) }),
  listByProduct: (productId: string) =>
    request<any[]>(`/api/reviews/product/${productId}`),
  canReview: (productId: string) =>
    request<{ canReview: boolean; hasOrdered: boolean; alreadyReviewed: boolean }>(`/api/reviews/can-review/${productId}`),
  moderate: () => request<any[]>("/api/reviews/moderate"),
  approve: (id: string, isApproved: boolean) =>
    request<any>(`/api/reviews/${id}/approve`, { method: "PUT", body: JSON.stringify({ isApproved }) }),
  myReviews: () => request<Array<{ _id: string; rating: number; comment: string; isApproved: boolean; createdAt: string; product?: { title?: string } }>>("/api/reviews/my"),
};

// Support Tickets
export const supportTicketsApi = {
  create: (body: { subject: string; message: string; priority?: string }) =>
    request<any>("/api/support-tickets", { method: "POST", body: JSON.stringify(body) }),
  myTickets: () => request<any[]>("/api/support-tickets/my-tickets"),
  allTickets: () => request<any[]>("/api/support-tickets"),
  reply: (id: string, message: string, status?: string) =>
    request<any>(`/api/support-tickets/${id}/reply`, { method: "PUT", body: JSON.stringify({ message, status }) }),
};

// Notifications
export const notificationsApi = {
  list: () => request<any[]>("/api/notifications"),
  markRead: (id: string) =>
    request<any>(`/api/notifications/${id}/read`, { method: "PUT" }),
};

// Transactions
export const transactionsApi = {
  myTransactions: () => request<any[]>("/api/transactions"),
  allTransactions: () => request<any[]>("/api/transactions/admin"),
};

// Payments
export const paymentsApi = {
  createIntentFromCart: (couponCode?: string, useReferralPoints?: boolean, referralPointsToUse?: number) =>
    request<{ clientSecret: string; paymentIntentId: string; totalAmount: number }>("/api/payments/create-intent-cart", { method: "POST", body: JSON.stringify({ couponCode, useReferralPoints, referralPointsToUse }) }),
  createIntent: (orderId: string) =>
    request<{ clientSecret: string; paymentIntentId: string; totalAmount: number; orderId: string }>("/api/payments/create-intent", { method: "POST", body: JSON.stringify({ orderId }) }),
  verify: (orderId: string, paymentIntentId: string) =>
    request<{ success: boolean; message: string; order?: any }>("/api/payments/verify", { method: "POST", body: JSON.stringify({ orderId, paymentIntentId }) }),
  payNow: (orderId: string, paymentMethod: string = "card") =>
    request<{ success: boolean; message: string; order?: any }>(`/api/payments/pay-now/${orderId}`, { method: "POST", body: JSON.stringify({ paymentMethod }) }),
};

// Dashboard
export const dashboardApi = {
  admin: () => request<any>("/api/dashboard/admin"),
  vendor: () => request<any>("/api/dashboard/vendor"),
};

// Coupons
export const couponsApi = {
  list: () => request<any[]>("/api/coupons"),
  validate: (code: string, subtotal: number) =>
    request<{ valid: boolean; discountAmount?: number; finalAmount?: number; message?: string }>(
      `/api/coupons/validate?code=${encodeURIComponent(code)}&subtotal=${subtotal}`
    ),
};

// Orders
export const ordersApi = {
  create: (body: { addressId?: string; address?: { fullName: string; phone: string; street: string; city: string; state: string; pincode: string }; couponCode?: string; useReferralPoints?: boolean; referralPointsToUse?: number; paymentMethod?: string; paymentStatus?: string; paymentId?: string }) =>
    request<Record<string, unknown>>("/api/orders", { method: "POST", body: JSON.stringify(body) }),
  myOrders: () => request<Array<{ _id: string; items: Array<{ title?: string; quantity: number; price: number }>; totalAmount: number; orderStatus: string; createdAt: string }>>("/api/orders"),
  byId: (id: string) => request<Record<string, unknown>>(`/api/orders/${id}`),
  getById: (id: string) => request<Record<string, unknown>>(`/api/orders/${id}`),
  cancel: (id: string, reason?: string) =>
    request<Record<string, unknown>>(`/api/orders/${id}/cancel`, {
      method: "PATCH",
      ...(reason ? { body: JSON.stringify({ reason }) } : {}),
    }),
};

// Addresses
export const addressesApi = {
  list: () => request<unknown[]>("/api/addresses"),
  add: (body: { fullName: string; phone: string; street: string; city: string; state: string; pincode: string; isDefault?: boolean }) =>
    request<unknown>("/api/addresses", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<{ fullName: string; phone: string; street: string; city: string; state: string; pincode: string; isDefault: boolean }>) =>
    request<unknown>(`/api/addresses/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => request<unknown>(`/api/addresses/${id}`, { method: "DELETE" }),
};

// Wishlist
export const wishlistApi = {
  list: () => request<unknown[]>("/api/wishlist"),
  add: (productId: string) =>
    request<unknown[]>("/api/wishlist", { method: "POST", body: JSON.stringify({ productId }) }),
  remove: (productId: string) =>
    request<unknown[]>(`/api/wishlist/${productId}`, { method: "DELETE" }),
};

// Returns
export const returnsApi = {
  create: (body: { orderId: string; items: Array<{ productId: string; quantity: number; reason?: string }> }) =>
    request<any>("/api/returns", { method: "POST", body: JSON.stringify(body) }),
  myReturns: () => request<Array<{ _id: string; status: string; refundAmount: number; reason?: string; createdAt: string; orderId?: { _id?: string }; items?: Array<{ quantity: number; productId?: { title?: string; images?: string[] } }>; deliveryStatus?: string; tracking?: string }>>("/api/returns/my"),
  track: (query: string) => request<any>(`/api/returns/track/${encodeURIComponent(query)}`),
};

// Settings & CMS
export const settingsApi = {
  get: () => request<{ codOn?: boolean; codCharge?: number; [key: string]: any }>("/api/settings"),
};

export const cmsApi = {
  getPage: (slug: string) => request<any>(`/api/cms/pages/${slug}`),
  getFaqs: () => request<any[]>("/api/cms/faqs"),
  getBlogs: () => request<any[]>("/api/cms/blogs"),
  getBlog: (slug: string) => request<any>(`/api/cms/blogs/${slug}`),
};

export const homePageApi = {
  getHomePage: () => request<{ success: boolean; sections: any[] }>("/api/cms/home-page"),
  getTopBarOffers: () =>
    request<{
      success: boolean;
      messages: string[];
      supportText: string;
      isActive: boolean;
      intervalSeconds: number;
    }>("/api/cms/home-page/top-bar-offers"),
  subscribeNewsletter: (email: string) =>
    request<{ success: boolean; message: string }>("/api/cms/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
};
