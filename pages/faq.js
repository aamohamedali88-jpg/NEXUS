/**
 * HUSIN NEXUS — /faq
 * الأسئلة الشائعة
 * Mirrors the legal-page design system; accordion reuses the
 * existing [data-thq="accordion"] global reset already loaded in _document.js
 */

import { useState } from 'react'
import Head       from 'next/head'
import Navigation from '../components/navigation'
import Footer     from '../components/footer'

const FAQS = [
  {
    cat: 'الطلبات والدفع — Orders & Payment',
    items: [
      {
        q: 'كيف أتابع حالة طلبي؟',
        sub: 'How do I track my order?',
        a: 'بمجرد توفير رقم التتبع من المورّد، يظهر تلقائيًا في سجل طلباتك ضمن حسابك على HUSIN، وتصلك رسالة بريد إلكتروني بالتحديث.',
      },
      {
        q: 'ما هي طرق الدفع المتاحة؟',
        sub: 'What payment methods are available?',
        a: 'يمكنك الدفع عبر PayPal أو بطاقتك البنكية (Visa / Mastercard) المدمجة مباشرة في صفحة الدفع.',
      },
      {
        q: 'هل السعر المعروض هو السعر النهائي؟',
        sub: 'Is the displayed price final?',
        a: 'نعم. السعر الظاهر أمام كل منتج، شاملًا رسوم الشحن، هو السعر النهائي — لا توجد رسوم إضافية تُضاف لاحقًا.',
      },
    ],
  },
  {
    cat: 'الشحن والتوصيل — Shipping & Delivery',
    items: [
      {
        q: 'كم يستغرق توصيل طلبي؟',
        sub: 'How long does delivery take?',
        a: 'تختلف المدة حسب المورّد والوجهة، وتتراوح عادة بين 10 و25 يوم عمل. التفاصيل الكاملة في صفحة سياسة الشحن.',
      },
      {
        q: 'هل تشحنون خارج المملكة العربية السعودية؟',
        sub: 'Do you ship outside Saudi Arabia?',
        a: 'نعم، نشحن إلى عدد من دول الخليج والدول الأخرى، مع اختلاف المدة المتوقعة بحسب الوجهة.',
      },
    ],
  },
  {
    cat: 'الاسترجاع والاستبدال — Returns & Refunds',
    items: [
      {
        q: 'هل يمكنني إرجاع المنتج؟',
        sub: 'Can I return my order?',
        a: 'نعم، يحق لك إرجاع المنتج خلال 14 يومًا من تاريخ الاستلام وفقًا لسياسة الاستبدال والاسترجاع.',
      },
      {
        q: 'كيف يتم استرداد المبلغ؟',
        sub: 'How is my refund processed?',
        a: 'يتم الاسترداد إلى وسيلة الدفع الأصلية (PayPal أو البطاقة) فور التحقق من استلام المنتج المُرتجع.',
      },
    ],
  },
  {
    cat: 'الحساب والخصوصية — Account & Privacy',
    items: [
      {
        q: 'كيف يمكنني التواصل مع خدمة العملاء؟',
        sub: 'How do I contact support?',
        a: 'يمكنك التواصل عبر support@husin.org أو من خلال صفحة الاتصال في أي وقت.',
      },
      {
        q: 'كيف تحافظون على خصوصية بياناتي؟',
        sub: 'How is my data protected?',
        a: 'تُخزَّن بيانات العملاء بشكل آمن ومنفصل، وتُستخدم فقط لإدارة طلباتك وتحسين تجربتك. التفاصيل الكاملة في سياسة الخصوصية.',
      },
    ],
  },
]

function FaqItem({ q, sub, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="faq-item" data-thq="accordion">
      <details
        className="faq-trigger"
        data-thq="accordion-trigger"
        open={open}
        onClick={(e) => { e.preventDefault(); setOpen(!open) }}
      >
        <summary className="faq-summary">
          <span className="faq-q-wrap">
            <span className="faq-q">{q}</span>
            <span className="faq-q-sub">{sub}</span>
          </span>
          <span className="faq-icon" data-thq="accordion-icon">▾</span>
        </summary>
      </details>
      <div className="faq-answer" data-thq="accordion-content">
        <p>{a}</p>
      </div>
    </div>
  )
}

export default function FAQPage() {
  return (
    <>
      <Head>
        <title>الأسئلة الشائعة — HUSIN Marketplace</title>
        <meta name="description" content="الأسئلة الشائعة حول الطلبات، الشحن، الدفع، والاسترجاع على منصة HUSIN" />
        <meta name="robots" content="index, follow" />
      </Head>

      <Navigation />

      <div className="legal-page">
        <div className="legal-inner">

          <div className="legal-header">
            <div className="legal-badge">❓ FAQ</div>
            <h1 className="legal-title">الأسئلة الشائعة</h1>
            <p className="legal-subtitle">Frequently Asked Questions</p>
            <div className="legal-meta">
              <span>آخر تحديث: يونيو 2026</span>
              <span className="legal-dot">·</span>
              <span>Last updated: June 2026</span>
            </div>
          </div>

          {FAQS.map((group, gi) => (
            <div className="legal-section" key={gi}>
              <h2 className="legal-section-title">
                <span className="legal-num">{String(gi + 1).padStart(2, '0')}</span>
                {group.cat}
              </h2>
              <div className="faq-group">
                {group.items.map((item, ii) => (
                  <FaqItem key={ii} {...item} />
                ))}
              </div>
            </div>
          ))}

          <div className="legal-contact">
            <h2>لم تجد إجابتك؟</h2>
            <p>تواصل مع فريق خدمة العملاء وسنساعدك في أقرب وقت:</p>
            <div className="legal-contact-grid">
              <a href="mailto:support@husin.org" className="legal-contact-item">
                <span>📧</span>
                <span>support@husin.org</span>
              </a>
              <a href="https://t.me/HusinSupport" className="legal-contact-item">
                <span>💬</span>
                <span>Telegram Support</span>
              </a>
            </div>
          </div>

        </div>
      </div>

      <Footer />

      <style jsx global>{`
        .legal-page {
          background: #050608;
          min-height: 100vh;
          padding: 0 0 80px;
          font-family: 'Roboto', 'Noto Sans Arabic', system-ui, sans-serif;
          color: #f4f5f7;
          direction: rtl;
        }
        .legal-inner { max-width: 900px; margin: 0 auto; padding: 0 24px; }
        .legal-header {
          text-align: center;
          padding: 60px 0 40px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          margin-bottom: 48px;
        }
        .legal-badge {
          display: inline-block;
          background: rgba(200,164,109,0.1);
          border: 1px solid rgba(200,164,109,0.25);
          color: #c8a46d;
          padding: 5px 16px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 16px;
          direction: ltr;
        }
        .legal-title {
          color: #fff;
          font-size: clamp(1.6rem, 4vw, 2.4rem);
          font-weight: 700;
          margin: 0 0 6px;
          line-height: 1.3;
        }
        .legal-subtitle { color: rgba(255,255,255,0.4); font-size: 1rem; margin: 0 0 16px; direction: ltr; }
        .legal-meta {
          color: rgba(255,255,255,0.3);
          font-size: 0.8rem;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          direction: ltr;
        }
        .legal-dot { opacity: 0.4; }
        .legal-section {
          margin-bottom: 44px;
          padding-bottom: 44px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .legal-section:last-of-type { border-bottom: none; }
        .legal-section-title {
          color: #fff;
          font-size: 1.15rem;
          font-weight: 700;
          margin: 0 0 20px;
          display: flex; align-items: center; gap: 12px;
        }
        .legal-num {
          background: rgba(200,164,109,0.1);
          border: 1px solid rgba(200,164,109,0.2);
          color: #c8a46d;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 20px;
          direction: ltr;
          flex-shrink: 0;
        }
        .legal-contact {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          margin-top: 48px;
        }
        .legal-contact h2 { color: #fff; font-size: 1.1rem; font-weight: 700; margin: 0 0 10px; }
        .legal-contact p { color: rgba(255,255,255,0.45); font-size: 0.88rem; margin: 0 0 20px; }
        .legal-contact-grid { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }
        .legal-contact-item {
          display: flex; align-items: center; gap: 8px;
          background: rgba(0,217,255,0.07);
          border: 1px solid rgba(0,217,255,0.2);
          color: #00d9ff;
          padding: 10px 20px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: background 0.2s;
          direction: ltr;
        }
        .legal-contact-item:hover { background: rgba(0,217,255,0.12); }

        /* FAQ accordion — built on top of existing [data-thq="accordion"] globals */
        .faq-group { display: flex; flex-direction: column; gap: 10px; }
        .faq-item {
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          background: rgba(255,255,255,0.02);
          overflow: hidden;
        }
        .faq-trigger summary { list-style: none; cursor: pointer; }
        .faq-trigger summary::-webkit-details-marker { display: none; }
        .faq-summary {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 18px;
        }
        .faq-q-wrap { display: flex; flex-direction: column; gap: 3px; }
        .faq-q { color: #fff; font-size: 0.92rem; font-weight: 600; }
        .faq-q-sub { color: rgba(255,255,255,0.35); font-size: 0.76rem; direction: ltr; }
        .faq-icon {
          color: #c8a46d;
          font-size: 0.9rem;
          flex-shrink: 0;
          margin-top: 2px;
          transition: transform 0.2s ease-in-out;
        }
        .faq-item details[open] .faq-icon { transform: rotate(180deg); }
        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.25s ease-in-out;
          padding: 0 18px;
        }
        .faq-item details[open] + .faq-answer {
          max-height: 600px;
          padding: 0 18px 18px;
        }
        .faq-answer p {
          color: rgba(255,255,255,0.6);
          font-size: 0.86rem;
          line-height: 1.75;
          margin: 0;
        }

        @media (max-width: 640px) {
          .legal-inner  { padding: 0 16px; }
          .legal-header { padding: 40px 0 28px; }
          .legal-title  { font-size: 1.4rem; }
          .legal-contact { padding: 22px 18px; }
        }
      `}</style>
    </>
  )
}
