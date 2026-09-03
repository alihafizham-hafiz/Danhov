import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { BLOG_POSTS, getPostBySlug } from '@/lib/blog-posts';
import type { BlogPost } from '@/lib/blog-posts';
import { getCachedBlogContent, setCachedBlogContent, isCacheStale } from '@/lib/blog-cache';

interface Props {
  params: Promise<{ slug: string[] }>;
}

const CATEGORY_IMAGES: Record<string, string> = {
  'Engagement Rings': '/abbraccio-one-wire-story.jpeg',
  'Wedding Bands': '/ring-viz.png',
  Diamonds: '/diamond-shapes/round.jpg',
  'Fine Jewelry': '/phil-5.jpg',
  Proposal: '/triad-ring.jpg',
  "Mother's Day": '/phil-4.jpg',
};

function blogImage(post: BlogPost): string {
  return CATEGORY_IMAGES[post.category] ?? '/triad-ring.jpg';
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug.split('/') }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: 'Post Not Found · DANHOV Blog' };
  return {
    title: `${post.title} · DANHOV Blog`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: blogImage(post) }],
      type: 'article',
    },
  };
}

async function fetchArticleContent(danhovPath: string): Promise<string | null> {
  // 1. Try Supabase cache first — always available even if danhov.com is down
  const cached = await getCachedBlogContent(danhovPath);
  const stale = cached ? await isCacheStale(danhovPath) : true;

  if (cached && !stale) return cached;

  // 2. Fetch fresh from danhov.com
  try {
    const url = `https://www.danhov.com/blog/${danhovPath}/`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DANHOV-Website/1.0)',
        Accept: 'text/html',
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return cached; // fall back to stale cache if live fetch fails
    const html = await res.text();

    // Extract the main article body from WordPress single post
    // Try .entry-content first, then .post-content, then article tag content
    const patterns = [
      /<div[^>]+class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div|<section|<footer|<aside)/i,
      /<div[^>]+class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div|<section|<footer|<aside)/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
    ];

    let content: string | null = null;
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        content = match[1];
        break;
      }
    }

    if (!content) return cached; // fall back to stale cache

    // Clean up the extracted HTML
    content = content
      // Remove script tags
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      // Remove style tags
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      // Remove social share widgets, nav, comments
      .replace(/<div[^>]*class="[^"]*(?:sharedaddy|share-|social-|related-|comments|wp-caption)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      // Remove WordPress shortcodes
      .replace(/\[[\w_-]+[^\]]*\]/g, '')
      // Strip all on* event handler attributes (onerror, onload, onclick, etc.)
      .replace(/\s+on\w+="[^"]*"/gi, '')
      .replace(/\s+on\w+='[^']*'/gi, '')
      // Strip javascript: URLs in href/src attributes
      .replace(/(href|src)="javascript:[^"]*"/gi, '$1="#"')
      .replace(/(href|src)='javascript:[^']*'/gi, "$1='#'")
      // Fix relative image URLs to point to danhov.com
      .replace(/src="\/(?!\/)/g, 'src="https://www.danhov.com/')
      .replace(/src='\/(?!\/)/g, "src='https://www.danhov.com/")
      // Fix relative links
      .replace(/href="\/blog\//g, 'href="/blog/')
      .trim();

    // 3. Save to Supabase cache (best-effort, non-blocking)
    void setCachedBlogContent(danhovPath, content).catch(() => {});

    return content;
  } catch {
    // If live fetch fails, serve whatever is in the cache (even stale)
    return cached;
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const rawContent = await fetchArticleContent(post.danhovPath);

  // Find related posts (same category, excluding current)
  const related = BLOG_POSTS.filter(
    (p) => p.category === post.category && p.slug !== post.slug
  ).slice(0, 3);

  return (
    <main className="blog-post-page">
      <style>{`
        .blog-post-page { font-family: 'Cormorant Garamond', serif; color: #1a1410; background: #faf6f1; }

        .post-breadcrumb { background: #fff; border-bottom: 1px solid #ede8e2; padding: 14px 24px; font-size: 12px; color: #8a7f76; }
        .post-breadcrumb a { color: #8a7f76; text-decoration: none; transition: color 0.15s; }
        .post-breadcrumb a:hover { color: #AC3438; }
        .post-breadcrumb span { margin: 0 8px; }

        .post-hero { background: linear-gradient(160deg, #1a1410 0%, #2c1f18 60%, #3d2a20 100%); padding: 64px 24px 56px; text-align: center; }
        .post-hero-cat { display: inline-block; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #AC3438; margin-bottom: 20px; }
        .post-hero h1 { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px, 4.5vw, 52px); font-weight: 400; color: #faf6f1; margin: 0 0 20px; line-height: 1.18; max-width: 760px; margin-left: auto; margin-right: auto; }
        .post-hero-meta { font-size: 13px; color: #9c8f86; }

        .post-featured-img { max-width: 860px; margin: 0 auto; padding: 0 24px; transform: translateY(-32px); }
        .post-featured-img-inner { border-radius: 8px; overflow: hidden; height: 440px; position: relative; background: linear-gradient(135deg, #1a1410 0%, #3d2a20 60%, #6b4d3a 100%); display: flex; align-items: center; justify-content: center; }
        .post-featured-img-inner img { object-fit: cover; }
        .post-featured-img-inner svg { opacity: 0.2; }

        .post-body-wrap { max-width: 720px; margin: 0 auto; padding: 0 24px 80px; }

        .post-excerpt { font-family: 'Cormorant Garamond', serif; font-size: clamp(18px, 2.5vw, 24px); font-weight: 400; color: #4a3f38; line-height: 1.6; margin-bottom: 40px; padding-bottom: 40px; border-bottom: 1px solid #ede8e2; }

        .post-content { font-size: 16px; line-height: 1.8; color: #3a3028; }
        .post-content h1,
        .post-content h2,
        .post-content h3 { font-family: 'Cormorant Garamond', serif; font-weight: 400; color: #1a1410; margin: 2.2em 0 0.7em; line-height: 1.25; }
        .post-content h2 { font-size: clamp(22px, 3vw, 30px); }
        .post-content h3 { font-size: clamp(18px, 2.5vw, 24px); }
        .post-content p { margin: 0 0 1.5em; }
        .post-content ul, .post-content ol { margin: 0 0 1.5em 1.5em; }
        .post-content li { margin-bottom: 0.4em; }
        .post-content a { color: #AC3438; text-decoration: underline; text-underline-offset: 3px; }
        .post-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 2em 0; display: block; }
        .post-content blockquote { border-left: 3px solid #AC3438; margin: 2em 0; padding: 0 0 0 24px; font-family: 'Cormorant Garamond', serif; font-size: clamp(18px, 2.5vw, 23px); color: #4a3f38; }
        .post-content strong { font-weight: 600; color: #1a1410; }
        .post-content hr { border: none; border-top: 1px solid #ede8e2; margin: 2.5em 0; }

        .post-fallback { background: #fff; border: 1px solid #ede8e2; border-radius: 8px; padding: 40px; text-align: center; }
        .post-fallback p { color: #6b5e57; margin-bottom: 20px; }
        .post-fallback a { color: #AC3438; text-decoration: none; border-bottom: 1px solid rgba(172,52,56,0.35); }

        .post-related { background: #fff; border-top: 1px solid #ede8e2; padding: 64px 24px; }
        .post-related-inner { max-width: 1100px; margin: 0 auto; }
        .post-related-label { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #8a7f76; margin-bottom: 32px; display: block; }
        .post-related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
        .post-related-card { text-decoration: none; color: inherit; border: 1px solid #ede8e2; border-radius: 8px; overflow: hidden; background: #faf6f1; transition: box-shadow 0.15s; display: flex; flex-direction: column; }
        .post-related-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.07); }
        .post-related-img { height: 160px; position: relative; background: linear-gradient(135deg, #1a1410 0%, #3d2a20 60%, #6b4d3a 100%); display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .post-related-body { padding: 20px; }
        .post-related-cat { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #AC3438; margin-bottom: 8px; display: block; }
        .post-related-title { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; color: #1a1410; line-height: 1.3; margin: 0 0 8px; }
        .post-related-date { font-size: 11px; color: #9c8f86; }

        .post-back { max-width: 720px; margin: 0 auto; padding: 40px 24px 0; }
        .post-back a { color: #AC3438; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; border-bottom: 1px solid rgba(172,52,56,0.3); }

        @media (max-width: 640px) {
          .post-featured-img-inner { height: 240px; }
          .post-featured-img { transform: translateY(-20px); }
        }
      `}</style>

      {/* Breadcrumb */}
      <nav className="post-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/blog">Blog</Link>
        <span aria-hidden="true">/</span>
        <span>{post.category}</span>
      </nav>

      {/* Hero */}
      <section className="post-hero">
        <span className="post-hero-cat">{post.category}</span>
        <h1>{post.title}</h1>
        <p className="post-hero-meta">{post.date}</p>
      </section>

      {/* Featured image */}
      <div className="post-featured-img">
        <div className="post-featured-img-inner">
          <Image src={blogImage(post)} alt={post.title} fill style={{ objectFit: 'cover' }} priority />
        </div>
      </div>

      {/* Article body */}
      <div className="post-body-wrap">
        <p className="post-excerpt">{post.excerpt}</p>

        {rawContent ? (
          <div
            className="post-content"
            dangerouslySetInnerHTML={{ __html: rawContent }}
          />
        ) : (
          <div className="post-fallback">
            <p>
              Read the full article on the DANHOV website.
            </p>
            <a
              href={`https://www.danhov.com/blog/${post.danhovPath}/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read on DANHOV.com &rarr;
            </a>
          </div>
        )}

        <div className="post-back">
          <Link href="/blog">&larr; Back to Blog</Link>
        </div>
      </div>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="post-related">
          <div className="post-related-inner">
            <span className="post-related-label">More in {post.category}</span>
            <div className="post-related-grid">
              {related.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="post-related-card">
                  <div className="post-related-img">
                    <Image src={blogImage(r)} alt={r.title} fill style={{ objectFit: 'cover' }} />
                  </div>
                  <div className="post-related-body">
                    <span className="post-related-cat">{r.category}</span>
                    <h3 className="post-related-title">{r.title}</h3>
                    <p className="post-related-date">{r.date}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
