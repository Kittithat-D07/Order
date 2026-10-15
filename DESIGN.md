# Design System - Aura Bistro QR Order

<!-- impeccable:design-schema 1 -->

## Brand

- **Name**: Aura Bistro
- **Type**: Thai restaurant, warm and inviting
- **Personality**: Friendly, appetizing, modern but approachable

## Color Palette

```
Primary:        #E85A35 (Terracotta Orange)
Primary Dark:   #C8431F (Deep Terracotta)
Primary Light:  #FFF0ED (Blush)

Secondary:      #F59E0B (Amber)
Secondary Light:#FEF3C7 (Light Amber)

Background:     #FAF8F5 (Warm Cream)
Surface:        #FFFFFF (White)
Surface-2:      #F5F3F0 (Light Stone)
Border:         #E8E4DF (Warm Gray)

Text:           #1C1917 (Near Black)
Text Muted:     #78716C (Stone Gray)

Success:         #16A34A
Success Light:   #DCFCE7
Danger:          #DC2626
Danger Light:    #FEE2E2
Warning:         #F59E0B
Warning Light:   #FEF3C7
```

## Typography

- **Display Font**: Playfair Display (headings, prices)
- **UI Font**: Prompt (Thai support, body text)
- **Fallback**: system-ui, sans-serif

## Spacing

- Base unit: 4px
- Border radius: 0.5rem (sm), 0.75rem (md), 1rem (lg), 1.5rem (xl)
- Shadows: sm, md, lg, xl for elevation

## Components

### Cards
- White background with warm gray border
- Large border-radius (1rem - 1.5rem)
- Subtle shadows with warm tint
- Lift animation on hover (-4px)

### Buttons
- **Primary**: Gradient orange, rounded, shadow
- **Secondary**: White with border
- **Ghost**: Transparent with hover background

### Food Placeholders
- Gradient backgrounds (warm peachy tones)
- Food emoji icons (🍜🍲🥗🍛)
- Cycle through 7 gradient variations

### Animations
- Spring physics for natural feel
- 200-350ms transitions
- Scale animations for cart interactions
- Staggered reveals for lists

## Motion Principles

1. **Purposeful**: Every animation communicates state
2. **Quick**: 150-350ms for micro-interactions
3. **Natural**: Spring physics (damping: 25-30, stiffness: 300)
4. **Orchestrated**: Staggered reveals for lists

## Layout

- Mobile-first responsive
- Max-width: 48rem (768px) for content
- Consistent 1rem padding
- Safe area support for iOS

## Visual Assets

- Food images: Unsplash placeholders
- Icons: Lucide React
- Emoji for food categories and empty states
