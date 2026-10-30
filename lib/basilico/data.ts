export const GOLD = "#D9A35F";
export const BURNT = "#C97A2B";
export const INK = "#070707";
export const WARM_GRAY = "#BDBDBD";

export const HERO_BG =
  "https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/restaurant_bg.png";
export const HERO_VIDEO =
  "https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/hero_food_video.mp4";

export interface Dish {
  name: string;
  price: string;
  description: string;
  image: string;
}

export const FEATURED_DISHES: Dish[] = [
  {
    name: "Truffle Wagyu Ribeye",
    price: "฿2,890",
    description: "A5 wagyu, black truffle butter, smoked sea salt.",
    image:
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Seared Hokkaido Scallops",
    price: "฿1,290",
    description: "Cauliflower velouté, caviar, brown butter.",
    image:
      "https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Duck à l'Orange",
    price: "฿1,590",
    description: "Dry-aged duck, charred orange, jus gras.",
    image:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Wild Mushroom Risotto",
    price: "฿980",
    description: "Carnaroli rice, porcini, aged parmesan.",
    image:
      "https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=800&auto=format&fit=crop",
  },
];

export interface MenuItem {
  name: string;
  price: string;
  description?: string;
}

export interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export const FULL_MENU: MenuCategory[] = [
  {
    title: "Starters",
    items: [
      { name: "Burrata di Puglia", price: "฿520", description: "Heirloom tomato, basil oil, aged balsamic" },
      { name: "Seared Hokkaido Scallops", price: "฿1,290", description: "Cauliflower velouté, caviar" },
      { name: "Foie Gras au Torchon", price: "฿980", description: "Brioche, fig compote, port reduction" },
      { name: "Tuna Tartare", price: "฿680", description: "Avocado, yuzu kosho, sesame tuile" },
    ],
  },
  {
    title: "Mains",
    items: [
      { name: "Truffle Wagyu Ribeye", price: "฿2,890", description: "A5 wagyu, black truffle butter" },
      { name: "Duck à l'Orange", price: "฿1,590", description: "Dry-aged duck, charred orange" },
      { name: "Wild Mushroom Risotto", price: "฿980", description: "Carnaroli rice, porcini, parmesan" },
      { name: "Lobster Linguine", price: "฿1,780", description: "Bisque cream, tarragon, lemon" },
    ],
  },
  {
    title: "Desserts",
    items: [
      { name: "Valrhona Fondant", price: "฿420", description: "Salted caramel, vanilla gelato" },
      { name: "Pistachio Tiramisu", price: "฿380", description: "Espresso, mascarpone, cocoa" },
      { name: "Gold Leaf Panna Cotta", price: "฿450", description: "Champagne berries, almond tuile" },
    ],
  },
];

export interface TastingColumn {
  heading: string;
  courses: { no: string; name: string; detail: string }[];
}

export const TASTING_COLUMNS: TastingColumn[] = [
  {
    heading: "The Opening",
    courses: [
      { no: "01", name: "Amuse-Bouche", detail: "Chef's nightly whisper" },
      { no: "02", name: "Garden & Sea", detail: "Scallop, green apple, sea herbs" },
      { no: "03", name: "Golden Broth", detail: "Consommé, truffle, chive oil" },
    ],
  },
  {
    heading: "The Heart",
    courses: [
      { no: "04", name: "Fire & Oak", detail: "Wagyu ribeye, ember onion" },
      { no: "05", name: "Silent Forest", detail: "Mushroom, pine, black garlic" },
    ],
  },
  {
    heading: "The Finale",
    courses: [
      { no: "06", name: "Citrus Interlude", detail: "Yuzu, shiso, frozen honey" },
      { no: "07", name: "Midnight Gold", detail: "Valrhona, gold leaf, sea salt" },
    ],
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "A masterclass in restraint and fire. Basilico is the most exciting table in the city right now.",
    author: "Isabelle Marchand",
    role: "Michelin Guide Critic",
  },
  {
    quote:
      "Every plate arrives like a painting and disappears like a memory. The tasting menu is pure theatre.",
    author: "Daniel Okafor",
    role: "World's 50 Best Reviewer",
  },
  {
    quote:
      "Thorne cooks with a poet's patience. The wagyu course alone is worth crossing the ocean for.",
    author: "Sofia Lindqvist",
    role: "Condé Nast Traveler",
  },
];

export const GALLERY: { src: string; alt: string; tall?: boolean }[] = [
  {
    src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop",
    alt: "Candlelit dining room",
    tall: true,
  },
  {
    src: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=800&auto=format&fit=crop",
    alt: "Plated salmon",
  },
  {
    src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop",
    alt: "Restaurant interior",
  },
  {
    src: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop",
    alt: "Fire-grilled steak",
    tall: true,
  },
  {
    src: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=800&auto=format&fit=crop",
    alt: "Wine cellar selection",
  },
  {
    src: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=800&auto=format&fit=crop",
    alt: "Handmade pasta",
  },
  {
    src: "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=800&auto=format&fit=crop",
    alt: "Evening ambience",
    tall: true,
  },
  {
    src: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800&auto=format&fit=crop",
    alt: "Signature plating",
  },
  {
    src: "https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=800&auto=format&fit=crop",
    alt: "Chef's table dish",
  },
];

export const NAV_LINKS = [
  { label: "Dishes", href: "#dishes" },
  { label: "About", href: "#about" },
  { label: "Tasting", href: "#tasting" },
  { label: "Experience", href: "#experience" },
  { label: "Gallery", href: "#gallery" },
];
