import { Capacitor } from "@capacitor/core";

// Dynamically import NativePurchases or resolve stub
let NativePurchases = null;
let PURCHASE_TYPE = { INAPP: "INAPP", SUBS: "SUBS" };

if (Capacitor.isNativePlatform()) {
  try {
    // Standard import since we installed the package
    import("@capgo/native-purchases").then((module) => {
      NativePurchases = module.NativePurchases;
      if (module.PURCHASE_TYPE) {
        PURCHASE_TYPE = module.PURCHASE_TYPE;
      }
    }).catch(e => {
      console.warn("Failed to load native-purchases plugin module:", e);
    });
  } catch (err) {
    console.warn("Could not initialize Capgo native purchases plugin:", err);
  }
}

/**
 * Checks if native IAP is available and supported on this platform/device.
 * @returns {Promise<boolean>} True if native billing is supported
 */
export async function isIAPSupported() {
  if (!Capacitor.isNativePlatform() || !NativePurchases) {
    return false;
  }
  try {
    const { isBillingSupported } = await NativePurchases.isBillingSupported();
    return !!isBillingSupported;
  } catch (err) {
    console.error("[IAP Service] Error checking billing support:", err);
    return false;
  }
}

/**
 * Fetches localized product metadata from App Store / Google Play.
 * Falls back to mock details on web.
 * @param {Array<string>} productIds Product IDs to fetch
 * @returns {Promise<Array<object>>} Products list with price, title, id
 */
export async function fetchProductDetails(productIds) {
  const isSupported = await isIAPSupported();
  
  if (!isSupported) {
    // Web mock data fallback
    return productIds.map(id => {
      let title = "Premium Pack";
      let price = "$1.99";
      let desc = "Unlock classic premium theme styles.";
      
      if (id === "cozy_pack") {
        title = "Cozy Village Pack";
        desc = "Unlocks 3 themes: Pocket Crossing, Spirit Bathhouse, Matcha Tea.";
      } else if (id === "badbitch_pack") {
        title = "Y2K Glam Pack";
        desc = "Unlocks 3 themes: 8-Ball, Long Nails, Sheer.";
      } else if (id === "weeb_pack") {
        title = "Otaku Legends Pack";
        desc = "Unlocks 3 themes: Straw Hat Pirate, Slayer Blade, Sorcery Curse.";
      } else if (id === "screamo_pack") {
        title = "Mall Goth / Screamo Pack";
        desc = "Unlocks 3 themes: Vampire Romance, Sunday Showdown, Quiet Things.";
      } else if (id === "teen_idol_pack") {
        title = "Teen Idol Pack";
        desc = "Unlocks 3 themes: Oops Pink, Frosted Tips, Wannabe Leopard.";
      } else if (id === "skateland_punk_pack") {
        title = "Skateland Punk Pack";
        desc = "Unlocks 3 themes: Sk8er Boi, Rock Show 182, Boulevard Stencil.";
      } else if (id === "file_share_pack") {
        title = "P2P File Share Pack";
        desc = "Unlocks 3 themes: LemonWire, Napster Kitty, Winamp Classic.";
      } else if (id === "socialite_gossip_pack") {
        title = "Socialite Gossip Pack";
        desc = "Unlocks 3 themes: Simple Life, Metallic Razr, Gossip Blog.";
      }
      
      return {
        productIdentifier: id,
        title,
        price,
        description: desc,
        isMock: true
      };
    });
  }

  try {
    console.log("[IAP Service] Fetching native products info for:", productIds);
    const result = await NativePurchases.getProducts({ productIdentifiers: productIds });
    // Capgo getProducts returns { products: Array<{ productIdentifier, title, price, description, currency, ... }> }
    return result.products || [];
  } catch (err) {
    console.error("[IAP Service] Failed to retrieve native product details:", err);
    // Graceful fallback to mock details so screen loads
    return productIds.map(id => ({
      productIdentifier: id,
      title: id.replace("_", " ").toUpperCase(),
      price: "$1.99",
      description: "App Store Local Lookup Failed",
      isMock: true
    }));
  }
}

/**
 * Initiates purchasing for a specific product ID.
 * Supports native App Store Connect checkout and web local storage simulation.
 * @param {string} productId The product identifier to buy
 * @returns {Promise<{ success: boolean, transactionId?: string, error?: string }>}
 */
export async function purchaseProduct(productId) {
  const isSupported = await isIAPSupported();

  if (!isSupported) {
    console.log(`[IAP Service] Using simulated Web Checkout for: ${productId}`);
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      success: true,
      transactionId: "mock_tx_" + Math.random().toString(36).slice(2, 12)
    };
  }

  try {
    console.log(`[IAP Service] Triggering Native Purchase Flow for: ${productId}`);
    const transaction = await NativePurchases.purchaseProduct({
      productIdentifier: productId,
      productType: PURCHASE_TYPE.INAPP,
      quantity: 1
    });

    console.log("[IAP Service] Native Purchase Complete. Transaction ID:", transaction.transactionId);
    return {
      success: true,
      transactionId: transaction.transactionId
    };
  } catch (err) {
    console.error("[IAP Service] Native purchase failed:", err);
    return {
      success: false,
      error: err.message || String(err)
    };
  }
}

/**
 * Restores previous purchases for non-consumable items.
 * @returns {Promise<Array<string>>} List of product identifiers successfully restored
 */
export async function restorePurchases() {
  const isSupported = await isIAPSupported();
  
  if (!isSupported) {
    console.log("[IAP Service] Web simulation restore: Success.");
    return [];
  }

  try {
    console.log("[IAP Service] Restoring native transactions...");
    const result = await NativePurchases.restorePurchases();
    // Capgo restorePurchases returns { transactions: Array<{ productIdentifier, ... }> }
    const transactions = result.transactions || [];
    return transactions.map(t => t.productIdentifier).filter(Boolean);
  } catch (err) {
    console.error("[IAP Service] Failed to restore purchases natively:", err);
    throw err;
  }
}
