```javascript
export const VALID_CATEGORIES = [
  'mobiles', 'laptops', 'electronics', 'home_appliances',
  'clothes_men', 'clothes_women', 'clothes_kids',
  'jewelry', 'beauty', 'sports', 'toys', 'general',
]

const ACCESSORY_KEYWORDS = [
  'case', 'cover', 'sleeve', 'pouch', 'skin', 'screen protector',
  'tempered glass', 'charger', 'charging cable', 'cable', 'adapter',
  'holder', 'mount', 'stand', 'strap', 'band only', 'lens protector',
  'replacement part', 'spare part', 'for iphone', 'for samsung',
  'compatible with', 'fits iphone', 'fits samsung',
]

const EBAY_CATEGORY_KEYWORDS = {
  mobiles:          ['cell phone', 'smartphone', 'mobile phone'],
  laptops:          ['laptop', 'notebook computer', 'macbook'],
  electronics:      ['consumer electronics', 'headphone', 'tablet', 'camera', 'video game', 'smart watch', 'wearable'],
  home_appliances:  ['major appliance', 'small kitchen appliance', 'vacuum', 'home appliance'],
  clothes_men:      ["men's clothing", "men's shoes", "men's accessories"],
  clothes_women:    ["women's clothing", "women's shoes", "women's handbag", "women's accessories"],
  clothes_kids:     ['baby clothing', "kids' clothing", "girls' clothing", "boys' clothing"],
  jewelry:          ['jewelry', 'fine jewelry', 'fashion jewelry', 'watch'],
  beauty:           ['fragrance', 'skin care', 'makeup', 'beauty'],
  sports:           ['sporting goods', 'exercise', 'fitness', 'outdoor sports'],
  toys:             ['toy', 'hobbies', 'action figure', 'building toy'],
}

const TITLE_KEYWORDS = {
  mobiles:          ['iphone', 'galaxy s', 'galaxy a', 'galaxy z', 'pixel', 'oneplus', 'smartphone'],
  laptops:          ['macbook', 'laptop', 'notebook', 'thinkpad', 'chromebook'],
  electronics:      ['airpods', 'headphone', 'earbuds', 'ipad', 'tablet', 'playstation', 'xbox', 'nintendo', 'gopro', 'drone', 'smartwatch', 'apple watch'],
  home_appliances:  ['vacuum', 'air fryer', 'blender', 'kitchenaid', 'nespresso', 'dyson', 'coffee maker'],
  clothes_men:      ["men's", 'mens ', 'polo shirt', "men's jeans"],
  clothes_women:    ["women's", 'womens ', 'handbag', 'dress', 'heels'],
  clothes_kids:     ['kids', 'toddler', 'baby clothing', 'youth size'],
  jewelry:          ['gold ring', 'diamond', 'necklace', 'bracelet', 'pandora', 'cartier'],
  beauty:           ['perfume', 'cologne', 'lipstick', 'skincare', 'serum', 'foundation'],
  sports:           ['sneakers', 'running shoes', 'nike', 'adidas', 'yoga', 'dumbbell'],
  toys:             ['lego', 'action figure', 'hot wheels', 'barbie', 'nerf'],
}

function isAccessoryListing(title) {
  const t = title.toLowerCase()
  return ACCESSORY_KEYWORDS.some(kw => t.includes(kw))
}

function mapFromEbayCategory(ebayCategories) {
  if (!ebayCategories || ebayCategories.length === 0) return null
  const names = ebayCategories.map(c => (c.categoryName || '').toLowerCase()).join(' | ')

  for (const [husinCat, keywords] of Object.entries(EBAY_CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => names.includes(kw))) return husinCat
  }
  return null
}

function mapFromTitle(title, intendedDeviceCategory) {
  const t = title.toLowerCase()
  const deviceCategories = ['mobiles', 'laptops', 'electronics']

  for (const [husinCat, keywords] of Object.entries(TITLE_KEYWORDS)) {
    const matched = keywords.some(kw => t.includes(kw))
    if (!matched) continue

    if (deviceCategories.includes(husinCat) && isAccessoryListing(title)) {
      continue
    }
    return husinCat
  }
  return null
}

export function mapCategory({ title = '', ebayCategories = [], intendedCategory = 'general' }) {
  const accessory = isAccessoryListing(title)

  const ebayMatch = mapFromEbayCategory(ebayCategories)
  if (ebayMatch) {
    if (accessory && ['mobiles', 'laptops'].includes(ebayMatch)) {
      return { category: 'electronics', confidence: 'ebay', isAccessory: true }
    }
    return { category: ebayMatch, confidence: 'ebay', isAccessory: accessory }
  }

  const titleMatch = mapFromTitle(title, intendedCategory)
  if (titleMatch) {
    return { category: titleMatch, confidence: 'title', isAccessory: accessory }
  }

  if (VALID_CATEGORIES.includes(intendedCategory) && intendedCategory !== 'general') {
    if (accessory && ['mobiles', 'laptops'].includes(intendedCategory)) {
      return { category: 'electronics', confidence: 'task', isAccessory: true }
    }
    return { category: intendedCategory, confidence: 'task', isAccessory: accessory }
  }

  return { category: 'general', confidence: 'fallback', isAccessory: accessory }
}
```
