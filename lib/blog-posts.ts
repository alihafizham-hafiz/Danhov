export type BlogPost = {
  slug: string;       // path segment(s) after /blog/ on this site
  title: string;
  category: string;
  date: string;
  excerpt: string;
  image: string | null;
  danhovPath: string; // path after /blog/ on danhov.com — used to fetch full content
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'mothers-day/mothers-day-gift-guide-2024',
    title: "Mother's Day Gift Guide 2024",
    category: "Mother's Day",
    date: 'April 16, 2024',
    excerpt:
      "Mother's Day is just around the corner, and it's time to start thinking about the perfect gift for the special woman in your life. While flowers and chocolates are always appreciated, why not give a gift that will last a lifetime?",
    image: 'https://www.danhov.com/wp/wp-content/uploads/2020/05/80611469_522848228323736_1639246393256064443_n.jpg',
    danhovPath: 'mothers-day/mothers-day-gift-guide-2024',
  },
  {
    slug: 'engagement-rings-2/the-timeless-elegance-of-rose-gold-wedding-bands-for-brides',
    title: 'The Timeless Elegance of Rose Gold Wedding Bands for Brides',
    category: 'Engagement Rings',
    date: 'November 18, 2023',
    excerpt:
      'In the enchanting realm of bridal jewelry, a magnetic allure beckons brides to rose gold\'s timeless and romantic embrace. Rose gold wedding bands for women have soared to remarkable heights of popularity.',
    image: 'https://www.danhov.com/media/wordpress/aa25028a8dc72b007479e37bb47d6eb6.jpg',
    danhovPath: 'engagement-rings-2/the-timeless-elegance-of-rose-gold-wedding-bands-for-brides',
  },
  {
    slug: 'engagement-rings-2/a-tension-set-ring-as-a-promise-of-forever-is-it-right-for-your-proposal',
    title: 'A Tension Set Ring As A Promise Of Forever: Is It Right For Your Proposal?',
    category: 'Engagement Rings',
    date: 'November 17, 2023',
    excerpt:
      'When it comes to choosing the impeccable engagement ring, couples are often overwhelmed by the multitude of options available. The classic solitaire, glamorous halo, and intricate vintage designs have long dominated the scene.',
    image: null,
    danhovPath: 'engagement-rings-2/a-tension-set-ring-as-a-promise-of-forever-is-it-right-for-your-proposal',
  },
  {
    slug: 'wedding-bands-2/affordable-and-stylish-unique-wedding-bands-for-budget-conscious-grooms',
    title: 'Affordable and Stylish: Unique Wedding Bands for Budget-Conscious Grooms',
    category: 'Wedding Bands',
    date: 'November 16, 2023',
    excerpt:
      'When it comes to choosing the impeccable wedding band, grooms often seek a beccable balance between impeccable style and budget. With a wealth of options brimming with innovative materials and designs.',
    image: 'https://www.danhov.com/media/wordpress/d1a479d47cd832dcc78abc6c147ae983.jpg',
    danhovPath: 'wedding-bands-2/affordable-and-stylish-unique-wedding-bands-for-budget-conscious-grooms',
  },
  {
    slug: 'wedding-bands-2/a-grooms-guide-to-wedding-bands-trends-and-traditions',
    title: "A Groom's Guide to Wedding Bands: Trends and Traditions",
    category: 'Wedding Bands',
    date: 'October 20, 2023',
    excerpt:
      'In the grand tapestry of wedding preparations, one element often holds a special place for grooms — the selection of their wedding band. It\'s a symbol of commitment, a piece of jewelry that will be worn every day.',
    image: null,
    danhovPath: 'wedding-bands-2/a-grooms-guide-to-wedding-bands-trends-and-traditions',
  },
  {
    slug: 'engagement-rings-2/why-couples-choose-handcrafted-engagement-rings',
    title: 'Why Couples Choose Handcrafted Engagement Rings',
    category: 'Engagement Rings',
    date: 'October 19, 2023',
    excerpt:
      'When it comes to engagement rings, many couples are embracing a trend that goes beyond traditional mass-produced jewelry. Handcrafted engagement rings, known for their unique touch, have captured the hearts of modern couples.',
    image: 'https://www.danhov.com/media/wordpress/00beda3baacdb4068a9b81c9ee2e76b6.png',
    danhovPath: 'engagement-rings-2/why-couples-choose-handcrafted-engagement-rings',
  },
  {
    slug: 'wedding-bands-2/the-warmth-of-rose-gold-why-brides-and-grooms-love-it',
    title: 'The Warmth of Rose Gold: Why Brides and Grooms Love It',
    category: 'Wedding Bands',
    date: 'October 18, 2023',
    excerpt:
      'In the world of wedding jewelry, one metal has been steadily capturing the hearts of brides and grooms — rose gold. This enchanting hue, with its warm and rosy tones, has become a symbol of romance.',
    image: 'https://www.danhov.com/media/wordpress/78837aa57adbfbaa8f766cbc5d506661.jpg',
    danhovPath: 'wedding-bands-2/the-warmth-of-rose-gold-why-brides-and-grooms-love-it',
  },
  {
    slug: 'engagement-rings-2/tension-engagement-rings-a-symphony-of-design-and-precision',
    title: 'Tension Engagement Rings: A Symphony of Design and Precision',
    category: 'Engagement Rings',
    date: 'October 17, 2023',
    excerpt:
      'In the realm of engagement rings, the tension ring holds a particular allure — a masterpiece of design and precision that showcases a diamond in a seemingly impossible floating arrangement.',
    image: null,
    danhovPath: 'engagement-rings-2/tension-engagement-rings-a-symphony-of-design-and-precision',
  },
  {
    slug: 'engagement-rings-2/fall-in-love-choosing-the-perfect-autumn-engagement-ring',
    title: 'Fall in Love: Choosing the Perfect Autumn Engagement Ring',
    category: 'Engagement Rings',
    date: 'September 30, 2023',
    excerpt:
      'As the leaves change and the air becomes crisp, autumn provides a breathtaking backdrop for one of life\'s most significant moments — a marriage proposal.',
    image: null,
    danhovPath: 'engagement-rings-2/fall-in-love-choosing-the-perfect-autumn-engagement-ring',
  },
  {
    slug: 'diamonds/hottest-trends-alert-his-wedding-bands-thatll-make-heads-turn',
    title: "Hottest Trends Alert: His Wedding Bands That'll Make Heads Turn!",
    category: 'Diamonds',
    date: 'September 21, 2023',
    excerpt:
      'When it comes to wedding bands for men, the trends are sizzling, with unique designs and materials making waves in the world of men\'s jewelry.',
    image: null,
    danhovPath: 'diamonds/hottest-trends-alert-his-wedding-bands-thatll-make-heads-turn',
  },
  {
    slug: 'engagement-rings-2/handmade-engagement-rings-that-define-romance',
    title: 'Unique, One-Of-A-Kind: Handmade Engagement Rings That Define Romance',
    category: 'Engagement Rings',
    date: 'September 20, 2023',
    excerpt:
      'In a world filled with mass-produced jewelry, handmade engagement rings stand as a testament to love, craftsmanship, and individuality.',
    image: null,
    danhovPath: 'engagement-rings-2/handmade-engagement-rings-that-define-romance',
  },
  {
    slug: 'engagement-rings-2/secrets-jewellers-dont-want-you-to-know-about-gold-engagement-rings',
    title: "The Secrets Jewellers Don't Want You To Know About Gold Engagement Rings",
    category: 'Engagement Rings',
    date: 'September 19, 2023',
    excerpt:
      'When it comes to engagement rings, the world of gold jewelry is filled with hidden gems of knowledge that jewellers may not readily share.',
    image: null,
    danhovPath: 'engagement-rings-2/secrets-jewellers-dont-want-you-to-know-about-gold-engagement-rings',
  },
  {
    slug: 'diamonds/why-lab-grown-cushion-cut-diamonds-are-taking-the-jewelry-world-by-storm',
    title: 'Why Lab Grown Cushion Cut Diamonds Are Taking The Jewelry World By Storm',
    category: 'Diamonds',
    date: 'September 18, 2023',
    excerpt:
      'In the ever-evolving world of jewelry, lab-grown cushion cut diamonds have emerged as a stunning alternative that\'s taking the industry by storm.',
    image: null,
    danhovPath: 'diamonds/why-lab-grown-cushion-cut-diamonds-are-taking-the-jewelry-world-by-storm',
  },
  {
    slug: 'engagement-rings-2/understanding-carat-weight-in-diamonds',
    title: 'Understanding Carat Weight In Diamonds',
    category: 'Engagement Rings',
    date: 'September 5, 2023',
    excerpt:
      'When shopping for a diamond, one of the most important factors to consider is carat weight. But what exactly does carat weight mean, and how does it affect the value and appearance of a diamond?',
    image: null,
    danhovPath: 'engagement-rings-2/understanding-carat-weight-in-diamonds',
  },
  {
    slug: 'engagement-rings-2/danhovs-gold-swirl-engagement-rings-speak-of-timeless-love',
    title: "DANHOV's Gold Swirl Engagement Rings Speak of Timeless Love",
    category: 'Engagement Rings',
    date: 'August 21, 2023',
    excerpt:
      "DANHOV's gold swirl engagement rings are a testament to timeless love, crafted to capture the beauty of an eternal embrace.",
    image: null,
    danhovPath: 'engagement-rings-2/danhovs-gold-swirl-engagement-rings-speak-of-timeless-love',
  },
  {
    slug: 'engagement-rings-2/unveiling-the-uniquely-brilliant-engagement-rings-by-danhov',
    title: 'Unveiling the Uniquely Brilliant Engagement Rings by DANHOV',
    category: 'Engagement Rings',
    date: 'August 18, 2023',
    excerpt:
      'At DANHOV, we believe that an engagement ring is more than just a piece of jewelry — it\'s a symbol of love, commitment, and the beginning of a new chapter.',
    image: null,
    danhovPath: 'engagement-rings-2/unveiling-the-uniquely-brilliant-engagement-rings-by-danhov',
  },
  {
    slug: 'engagement-rings-2/unveiling-the-enchanting-world-of-top-designer-engagement-rings',
    title: 'Unveiling the Enchanting World of Top Designer Engagement Rings',
    category: 'Engagement Rings',
    date: 'August 17, 2023',
    excerpt:
      'The world of designer engagement rings is a realm where artistry meets emotion, where every piece tells a unique love story.',
    image: null,
    danhovPath: 'engagement-rings-2/unveiling-the-enchanting-world-of-top-designer-engagement-rings',
  },
  {
    slug: 'wedding-bands-2/from-classic-to-modern-find-your-dream-14k-rose-gold-wedding-band-for-women',
    title: 'From Classic to Modern: Find Your Dream 14k Rose Gold Wedding Band for Women',
    category: 'Wedding Bands',
    date: 'July 12, 2023',
    excerpt:
      'Rose gold has long been celebrated for its warm, romantic hue that complements every skin tone. From classic designs to modern interpretations, our 14k rose gold wedding bands offer something for every bride.',
    image: null,
    danhovPath: 'wedding-bands-2/from-classic-to-modern-find-your-dream-14k-rose-gold-wedding-band-for-women',
  },
  {
    slug: 'engagement-rings-2/6-vintage-inspired-engagement-rings-for-a-modern-bride',
    title: '6 Vintage-Inspired Engagement Rings For A Modern Bride',
    category: 'Engagement Rings',
    date: 'July 11, 2023',
    excerpt:
      'Vintage-inspired engagement rings combine the timeless elegance of past eras with contemporary craftsmanship, creating pieces that are both nostalgic and fresh.',
    image: null,
    danhovPath: 'engagement-rings-2/6-vintage-inspired-engagement-rings-for-a-modern-bride',
  },
  {
    slug: 'wedding-bands-2/breaking-the-mold-with-unique-handcrafted-engagement-rings',
    title: 'Breaking The Mold With Unique Handcrafted Engagement Rings',
    category: 'Wedding Bands',
    date: 'June 21, 2023',
    excerpt:
      'In a market saturated with cookie-cutter designs, handcrafted engagement rings offer a refreshing alternative — pieces that are as unique as the love stories they celebrate.',
    image: 'https://www.danhov.com/media/wordpress/19a0aecfd42e690f68de9bdc09e522eb.jpg',
    danhovPath: 'wedding-bands-2/breaking-the-mold-with-unique-handcrafted-engagement-rings',
  },
  {
    slug: 'wedding-bands-2/seal-your-love-with-style-and-symbolism-with-couple-wedding-bands',
    title: 'Seal Your Love With Style And Symbolism With Couple Wedding Bands',
    category: 'Wedding Bands',
    date: 'June 19, 2023',
    excerpt:
      'Couple wedding bands are more than matching jewelry — they\'re a visible symbol of your bond, your commitment, and the life you\'ve chosen to build together.',
    image: 'https://www.danhov.com/media/wordpress/3eb706bfb2c26263204387926264a8b1.jpg',
    danhovPath: 'wedding-bands-2/seal-your-love-with-style-and-symbolism-with-couple-wedding-bands',
  },
  {
    slug: 'fine-jewelry-2/8-meaningful-jewelry-gifts-for-graduates',
    title: '8 Meaningful Jewelry Gifts For Graduates',
    category: 'Fine Jewelry',
    date: 'June 8, 2023',
    excerpt:
      'Graduation is a milestone worth celebrating with a gift as significant as the achievement itself. Here are eight meaningful jewelry pieces that make perfect graduation gifts.',
    image: null,
    danhovPath: 'fine-jewelry-2/8-meaningful-jewelry-gifts-for-graduates',
  },
  {
    slug: 'marketing/what-to-do-when-your-engagement-ring-is-too-big',
    title: 'What To Do When Your Engagement Ring Is Too Big',
    category: 'Engagement Rings',
    date: 'June 7, 2023',
    excerpt:
      'Receiving an engagement ring that doesn\'t quite fit can be a common occurrence. Here\'s everything you need to know about your options when your ring is too big.',
    image: null,
    danhovPath: 'marketing/what-to-do-when-your-engagement-ring-is-too-big',
  },
  {
    slug: 'engagement-rings-2/how-to-plan-a-dream-proposal-on-a-tight-budget',
    title: 'How to Plan a Dream Proposal on a Tight Budget',
    category: 'Proposal',
    date: 'April 21, 2023',
    excerpt:
      'A dream proposal doesn\'t require an unlimited budget. With thoughtful planning and a focus on what truly matters, you can create an unforgettable moment without breaking the bank.',
    image: null,
    danhovPath: 'engagement-rings-2/how-to-plan-a-dream-proposal-on-a-tight-budget',
  },
  {
    slug: 'engagement-rings-2/shop-smart-save-money-and-the-planet-with-danhovs-lab-grown-diamonds-online',
    title: "Shop Smart: Save Money And The Planet With DANHOV's Lab-Grown Diamonds Online",
    category: 'Diamonds',
    date: 'April 20, 2023',
    excerpt:
      'Lab-grown diamonds offer an ethical, sustainable, and affordable alternative to mined diamonds — without sacrificing beauty or brilliance.',
    image: null,
    danhovPath: 'engagement-rings-2/shop-smart-save-money-and-the-planet-with-danhovs-lab-grown-diamonds-online',
  },
  {
    slug: 'engagement-rings-2/romantic-blooms-danhovs-floral-and-rose-gold-engagement-rings',
    title: "Romantic Blooms: DANHOV's Floral and Rose Gold Engagement Rings for Every Style",
    category: 'Engagement Rings',
    date: 'April 19, 2023',
    excerpt:
      "DANHOV's floral engagement rings are a celebration of nature's most beautiful forms — designed for the romantic at heart.",
    image: null,
    danhovPath: 'engagement-rings-2/romantic-blooms-danhovs-floral-and-rose-gold-engagement-rings-for-every-style',
  },
  {
    slug: 'engagement-rings-2/the-ultimate-symbol-of-love-danhovs-abbraccio-engagement-ring-collection',
    title: "The Ultimate Symbol of Love: DANHOV's Abbraccio Engagement Ring Collection",
    category: 'Engagement Rings',
    date: 'April 14, 2023',
    excerpt:
      "The Abbraccio collection — Italian for 'embrace' — wraps the center stone in a graceful spiral of gold, symbolizing the eternal embrace of true love.",
    image: null,
    danhovPath: 'engagement-rings-2/the-ultimate-symbol-of-love-danhovs-abbraccio-engagement-ring-collection',
  },
  {
    slug: 'engagement-rings-2/lab-grown-diamonds-a-stunning-and-eco-friendly-choice',
    title: 'Lab Grown Diamonds: A Stunning and Eco-Friendly Choice',
    category: 'Diamonds',
    date: 'March 21, 2023',
    excerpt:
      'Lab-grown diamonds are chemically, physically, and optically identical to mined diamonds. They offer the same beauty and brilliance at a fraction of the environmental and financial cost.',
    image: null,
    danhovPath: 'engagement-rings-2/lab-grown-diamonds-a-stunning-and-eco-friendly-choice',
  },
  {
    slug: 'engagement-rings-2/danhovs-cushion-cut-engagement-rings-a-timeless-and-trending-choice',
    title: "DANHOV's Cushion Cut Engagement Rings: A Timeless and Trending Choice",
    category: 'Engagement Rings',
    date: 'March 20, 2023',
    excerpt:
      'The cushion cut diamond — with its rounded corners and large facets — combines vintage charm with modern brilliance. Discover why it remains one of the most sought-after shapes.',
    image: null,
    danhovPath: 'engagement-rings-2/danhovs-cushion-cut-engagement-rings-a-timeless-and-trending-choice',
  },
  {
    slug: 'engagement-rings-2/crafted-with-love-the-beauty-of-handmade-engagement-rings-by-danhov',
    title: 'Crafted With Love: The Beauty Of Handmade Engagement Rings By DANHOV',
    category: 'Engagement Rings',
    date: 'March 17, 2023',
    excerpt:
      'Every DANHOV engagement ring is crafted by hand in Los Angeles — a process that takes more time but produces something no machine can replicate: a ring with soul.',
    image: null,
    danhovPath: 'engagement-rings-2/crafted-with-love-the-beauty-of-handmade-engagement-rings-by-danhov',
  },
  {
    slug: 'engagement-rings-2/a-quick-guide-to-engagement-ring-unique-designs',
    title: 'A Quick Guide to Engagement Ring Unique Designs',
    category: 'Engagement Rings',
    date: 'January 17, 2023',
    excerpt:
      'From the classic round brilliant to the dramatic marquise, the shape of your diamond sets the tone for your entire ring. Here\'s a guide to help you find the right one.',
    image: null,
    danhovPath: 'engagement-rings-2/a-quick-guide-to-engagement-ring-unique-designs',
  },
  {
    slug: 'uniquely-handmade/four-elegant-rose-gold-wedding-band-styles',
    title: 'Four Elegant Rose Gold Wedding Band Styles',
    category: 'Wedding Bands',
    date: 'January 15, 2023',
    excerpt:
      'Rose gold continues to captivate with its warm, romantic glow. These four DANHOV rose gold wedding band styles offer something for every aesthetic — from boldly braided to softly minimal.',
    image: 'https://www.danhov.com/media/wordpress/4bfa99f1e05cb80365342a2902287e73.jpg',
    danhovPath: 'uniquely-handmade/four-elegant-rose-gold-wedding-band-styles',
  },
  {
    slug: 'engagement-rings-2/swirl-design-a-unique-style-for-engagement-ring',
    title: 'Swirl Design: A Unique Style For Engagement Ring',
    category: 'Engagement Rings',
    date: 'December 21, 2022',
    excerpt:
      "DANHOV's signature swirl design is instantly recognizable — a twist of gold that frames the center stone with movement, energy, and an unmistakable sense of life.",
    image: null,
    danhovPath: 'engagement-rings-2/swirl-design-a-unique-style-for-engagement-ring',
  },
  {
    slug: 'engagement-rings-2/five-reasons-to-customize-your-engagement-ring',
    title: 'Five Reasons To Customize Your Engagement Ring',
    category: 'Engagement Rings',
    date: 'December 20, 2022',
    excerpt:
      'A custom engagement ring is more than a purchase — it\'s a creative act. Here are five compelling reasons to go bespoke for the ring that will be worn every day for a lifetime.',
    image: null,
    danhovPath: 'engagement-rings-2/five-reasons-to-customize-your-engagement-ring',
  },
  {
    slug: 'uniquely-handmade/how-to-tell-if-a-diamond-is-real',
    title: 'How To Tell If A Diamond Is Real',
    category: 'Diamonds',
    date: 'December 19, 2022',
    excerpt:
      'Wondering if a diamond is genuine? From the fog test to the loupe test, here are 11 reliable methods to verify a diamond\'s authenticity — and when to trust a certified professional instead.',
    image: null,
    danhovPath: 'uniquely-handmade/how-to-tell-if-a-diamond-is-real',
  },
  {
    slug: 'events-2/10-unique-holiday-proposal-ideas',
    title: '10 Unique Holiday Proposal Ideas',
    category: 'Proposal',
    date: 'November 29, 2022',
    excerpt:
      'The holiday season is the most magical time of year to propose. Here are ten unique ideas to make your proposal as memorable as the love story it begins.',
    image: null,
    danhovPath: 'events-2/10-unique-holiday-proposal-ideas',
  },
  {
    slug: 'engagement-rings-2/tension-set-rings-a-modern-and-elegant-choice',
    title: 'Tension Set Rings: A Modern and Elegant Choice',
    category: 'Engagement Rings',
    date: 'November 21, 2022',
    excerpt:
      'Tension set rings achieve the impossible: holding a diamond in place using nothing but the spring tension of the metal band itself. The result is a stone that appears to float in mid-air.',
    image: null,
    danhovPath: 'engagement-rings-2/tension-set-rings-a-modern-and-elegant-choice',
  },
  {
    slug: 'engagement-rings-2/what-make-lab-grown-diamonds-a-unique-choice',
    title: 'What Makes Lab Grown Diamonds A Unique Choice',
    category: 'Diamonds',
    date: 'November 18, 2022',
    excerpt:
      'Lab-grown diamonds are created in controlled environments using advanced technology that replicates the conditions under which natural diamonds form. The result is a diamond that is chemically and visually identical.',
    image: null,
    danhovPath: 'engagement-rings-2/what-make-lab-grown-diamonds-a-unique-choice',
  },
  {
    slug: 'engagement-rings-2/buying-engagement-ring-dos-and-donts',
    title: "Buying Engagement Ring: Dos and Don'ts",
    category: 'Engagement Rings',
    date: 'November 17, 2022',
    excerpt:
      'Buying an engagement ring is one of the most significant purchases you\'ll ever make. Avoid common pitfalls and make the most of your budget with this essential guide.',
    image: null,
    danhovPath: 'engagement-rings-2/buying-engagement-ring-dos-and-donts',
  },
  {
    slug: 'engagement-rings-2/how-to-choose-a-wedding-band-that-can-complement-your-engagement-ring',
    title: 'How to Choose a Wedding Band that can Complement Your Engagement Ring',
    category: 'Wedding Bands',
    date: 'November 15, 2022',
    excerpt:
      'Finding a wedding band that pairs beautifully with your engagement ring doesn\'t have to be a challenge. Here\'s how to choose one that enhances — rather than competes with — your ring.',
    image: null,
    danhovPath: 'engagement-rings-2/how-to-choose-a-wedding-band-that-can-complement-your-engagement-ring',
  },
];

export function getPostBySlug(slugParts: string[]): BlogPost | undefined {
  const slug = slugParts.join('/');
  return BLOG_POSTS.find((p) => p.slug === slug);
}
