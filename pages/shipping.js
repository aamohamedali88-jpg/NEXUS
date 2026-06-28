/**
 * HUSIN NEXUS — /shipping
 * سياسة الشحن
 * Mirrors the legal-page design system used by /terms, /privacy, /returns
 */

import Head       from 'next/head'
import Navigation from '../components/navigation'
import Footer     from '../components/footer'

export default function ShippingPolicy() {
  return (
    <>
      <Head>
        <title>سياسة الشحن — HUSIN Marketplace</title>
        <meta name="description" content="سياسة الشحن لمنصة HUSIN — أوقات المعالجة، الرسوم، التتبع، والتوصيل الدولي" />
        <meta name="robots" content="index, follow" />
      </Head>

      <Navigation />

      <div className="legal-page">
        <div className="legal-inner">

          {/* Header */}
          <div className="legal-header">
            <div className="legal-badge">📦 Shipping Policy</div>
            <h1 className="legal-title">سياسة الشحن</h1>
            <p className="legal-subtitle">Shipping Policy</p>
            <div className="legal-meta">
              <span>آخر تحديث: يونيو 2026</span>
              <span className="legal-dot">·</span>
              <span>Last updated: June 2026</span>
            </div>
          </div>

          {/* Intro */}
          <div className="legal-intro">
            <p>
              تُورَّد منتجات <strong>HUSIN Marketplace</strong> من موردين دوليين، وبالتالي تختلف مواعيد الشحن
              حسب المنتج والوجهة. توضح هذه الصفحة كل ما تحتاج معرفته عن معالجة طلبك وشحنه وتتبعه.
            </p>
          </div>

          {/* Section 1 — Processing steps */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">01</span>
              معالجة الطلب — Order Processing
            </h2>
            <div className="legal-content">
              <div className="legal-steps">
                <div className="legal-step">
                  <div className="legal-step-num">1</div>
                  <div className="legal-step-body">
                    <h3>تأكيد الدفع — Payment Confirmed</h3>
                    <p>تبدأ معالجة الطلب فور تأكيد استلام الدفع بنجاح.</p>
                  </div>
                </div>
                <div className="legal-step">
                  <div className="legal-step-num">2</div>
                  <div className="legal-step-body">
                    <h3>التوريد — Sourcing</h3>
                    <p>يتم تنفيذ الطلب من المورّد خلال 1–3 أيام عمل من تأكيد الدفع.</p>
                  </div>
                </div>
                <div className="legal-step">
                  <div className="legal-step-num">3</div>
                  <div className="legal-step-body">
                    <h3>الشحن — Shipped</h3>
                    <p>تصلك رسالة بريد إلكتروني وتحديث في لوحة الحساب فور شحن الطلب.</p>
                  </div>
                </div>
                <div className="legal-step">
                  <div className="legal-step-num">4</div>
                  <div className="legal-step-body">
                    <h3>التوصيل — Delivered</h3>
                    <p>يصل الطلب إلى العنوان المحدد عند إتمام الشراء.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 — Fees */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">02</span>
              رسوم الشحن — Shipping Fees
            </h2>
            <div className="legal-content">
              <p>
                تظهر رسوم شحن واحدة فقط أثناء إتمام الطلب، تُحسب بحسب المنتج والوجهة وشركة الشحن.
                هذا هو المبلغ النهائي — لا توجد أي رسوم إضافية تُضاف بعد إتمام الطلب.
              </p>
              <div className="legal-highlight">
                <p>
                  💡 السعر الظاهر أمام كل منتج، بما فيه رسوم الشحن، هو السعر النهائي الذي ستدفعه — بدون مفاجآت لاحقة.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3 — Delivery timelines */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">03</span>
              مواعيد التوصيل المتوقعة — Estimated Delivery
            </h2>
            <div className="legal-content">
              <table className="legal-table">
                <thead>
                  <tr>
                    <th>الوجهة</th>
                    <th>المدة المتوقعة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>داخل المملكة العربية السعودية</td>
                    <td>10–18 يوم عمل</td>
                  </tr>
                  <tr>
                    <td>دول الخليج العربي</td>
                    <td>12–22 يوم عمل</td>
                  </tr>
                  <tr>
                    <td>دول أخرى</td>
                    <td>15–25 يوم عمل</td>
                  </tr>
                </tbody>
              </table>
              <p className="legal-note">
                ملاحظة: قد تختلف هذه المدد في المواسم ذات الطلب المرتفع أو بسبب إجراءات جمركية خارجة عن إرادتنا.
              </p>
            </div>
          </div>

          {/* Section 4 — Tracking */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">04</span>
              تتبع الطلب — Order Tracking
            </h2>
            <div className="legal-content">
              <p>
                بمجرد توفير المورّد لرقم التتبع، سيظهر تلقائيًا في سجل طلباتك ضمن حسابك على HUSIN،
                وستصلك رسالة بريد إلكتروني بالتحديث.
              </p>
            </div>
          </div>

          {/* Section 5 — Customs */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">05</span>
              الجمارك والرسوم الإضافية — Customs &amp; Import Duties
            </h2>
            <div className="legal-content">
              <p>
                تشمل الأسعار المعروضة رسوم الشحن الأساسية. في حالات نادرة، قد تُطبّق الجمارك السعودية رسومًا
                إضافية على بعض فئات المنتجات حسب الأنظمة المعمول بها؛ تقع هذه الرسوم على مسؤولية العميل
                ولا تُحصَّل من HUSIN عند إتمام الطلب.
              </p>
            </div>
          </div>

          {/* Section 6 — Delays */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">06</span>
              التأخير والاستثناءات — Delays &amp; Exceptions
            </h2>
            <div className="legal-content">
              <p>
                في حال نفاد مخزون المورّد أو تأخر الشحنة عن الموعد المتوقع، سنُعلمك عبر البريد الإلكتروني
                ونوفر رصيدًا في المتجر أو استردادًا وفق <a href="/returns" style={{color:'#00d9ff'}}>سياسة الاستبدال والاسترجاع</a>.
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="legal-contact">
            <h2>تواصل مع فريق خدمة العملاء</h2>
            <p>لأي استفسار بخصوص شحن طلب معين، تواصل معنا عبر:</p>
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
        /* Legal pages shared styles */
        .legal-page {
          background: #050608;
          min-height: 100vh;
          padding: 0 0 80px;
          font-family: 'Roboto', 'Noto Sans Arabic', system-ui, sans-serif;
          color: #f4f5f7;
          direction: rtl;
        }
        .legal-inner {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 24px;
        }

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
        .legal-subtitle {
          color: rgba(255,255,255,0.4);
          font-size: 1rem;
          margin: 0 0 16px;
          direction: ltr;
        }
        .legal-meta {
          color: rgba(255,255,255,0.3);
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          direction: ltr;
        }
        .legal-dot { opacity: 0.4; }

        .legal-intro {
          background: rgba(0,217,255,0.04);
          border: 1px solid rgba(0,217,255,0.12);
          border-radius: 12px;
          padding: 20px 24px;
          margin-bottom: 40px;
          font-size: 0.95rem;
          line-height: 1.8;
          color: rgba(255,255,255,0.75);
        }

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
          display: flex;
          align-items: center;
          gap: 12px;
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
        .legal-content {
          color: rgba(255,255,255,0.65);
          font-size: 0.9rem;
          line-height: 1.85;
        }
        .legal-content p { margin: 0 0 14px; }
        .legal-content p:last-child { margin: 0; }

        .legal-list {
          padding-right: 20px;
          margin: 12px 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .legal-list li::marker { color: #c8a46d; }

        .legal-steps { display: flex; flex-direction: column; gap: 16px; }
        .legal-step {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 16px 20px;
        }
        .legal-step-num {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(200,164,109,0.1);
          border: 1px solid rgba(200,164,109,0.25);
          color: #c8a46d;
          font-size: 0.72rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          direction: ltr;
        }
        .legal-step-body h3 {
          color: #fff;
          font-size: 0.9rem;
          font-weight: 700;
          margin: 0 0 6px;
        }
        .legal-step-body p {
          color: rgba(255,255,255,0.55);
          font-size: 0.84rem;
          line-height: 1.7;
          margin: 0;
        }

        .legal-highlight {
          background: rgba(200,164,109,0.06);
          border: 1px solid rgba(200,164,109,0.18);
          border-radius: 10px;
          padding: 16px 20px;
        }
        .legal-highlight p { margin: 0; }

        .legal-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
          margin-bottom: 14px;
          direction: rtl;
        }
        .legal-table th {
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.5);
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          text-align: right;
        }
        .legal-table td {
          padding: 11px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.7);
        }
        .legal-table tr:hover td { background: rgba(255,255,255,0.02); }

        .legal-note {
          color: rgba(255,255,255,0.35) !important;
          font-size: 0.78rem !important;
          font-style: italic;
        }

        .legal-contact {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          margin-top: 48px;
        }
        .legal-contact h2 {
          color: #fff;
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0 0 10px;
        }
        .legal-contact p {
          color: rgba(255,255,255,0.45);
          font-size: 0.88rem;
          margin: 0 0 20px;
        }
        .legal-contact-grid {
          display: flex;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .legal-contact-item {
          display: flex;
          align-items: center;
          gap: 8px;
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

        @media (max-width: 640px) {
          .legal-inner  { padding: 0 16px; }
          .legal-header { padding: 40px 0 28px; }
          .legal-title  { font-size: 1.4rem; }
          .legal-grid   { grid-template-columns: 1fr; }
          .legal-table  { font-size: 0.78rem; }
          .legal-table th, .legal-table td { padding: 8px 10px; }
          .legal-contact { padding: 22px 18px; }
        }
      `}</style>
    </>
  )
}
