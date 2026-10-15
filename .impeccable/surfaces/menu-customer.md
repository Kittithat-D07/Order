# Surface Brief: Customer Menu Page

## Scope
Customer-facing menu page at `/menu?table={token}`

## Mode
**Operate** - Customer completes task: browse menu, add items, checkout

## User
- Customer at restaurant table
- Using mobile phone
- Want to order food quickly

## Task
1. Browse menu by category
2. Search for items
3. Add items to cart
4. Adjust quantities, add notes
5. Checkout

## Design Direction

### Direction Contract

**THESIS**: A warm, appetizing menu that feels like browsing a food magazine. Images are the hero; interactions are instant and satisfying.

**OWN-WORLD**: 
- Terracotta primary (#E85A35) on warm cream (#FAF8F5)
- Playfair Display for display, Prompt for Thai
- Food images as focal point
- Card-based items with hover lift
- Spring animations for cart interactions

**STORY**: Customer opens menu, sees beautiful food photos, adds items with satisfying animations, checks out in under a minute.

**FIRST VIEWPORT**:
- Hero banner with restaurant name and table number
- Floating search bar below hero
- Horizontal category pills (sticky)
- Featured items carousel
- Category sections below

**SIGNATURE INTERACTION**: 
- Add to cart button scales with spring physics
- Cart badge bounces on item add
- Floating cart bar slides up when items added

## Decisions
- Sticky header with cart button
- Horizontal scroll categories
- Featured items as horizontal carousel
- Food emoji placeholders for missing images
