/**
 * HUSIN NEXUS — /returns
 * سياسة الاستبدال والاسترجاع
 * Saudi E-Commerce Law compliant — 14-day return window
 */

import Head       from 'next/head'
import Navigation from '../components/navigation'
import Footer     from '../components/footer'

export default function ReturnsPage() {
  return (
    <>
      <Head>
        <title>سياسة الاستبدال والاسترجاع — HUSIN Marketplace</title>
        <meta name="description" content="سياسة الاستبدال والاسترجاع لمنصة HUSIN — 14 يوم لإرجاع المنتجات" />
        <meta name="robots" content="index, follow" />
      </Head>

      <Navigation />

      <div className="legal-page">
        <div className="legal-inner">

          {/* Header */}
          <div className="legal-header">
            <div className="legal-badge">📦 Return Policy</div>
            <h1 className="legal-title">سياسة الاستبدال والاسترجاع</h1>
            <p className="legal-subtitle">Return & Refund Policy</p>
            <div className="legal-meta">
              <span>آخر تحديث: يونيو 2026</span>
              <span className="legal-dot">·</span>
              <span>Last updated: June 2026</span>
            </div>
          </div>

          {/* Intro */}
          <div className="legal-intro">
            <p>
              نلتزم في منصة <strong>HUSIN Nexus</strong> بتقديم تجربة تسوق موثوقة وآمنة تتوافق مع
              <strong> نظام التجارة الإلكترونية السعودي</strong> ولوائح وزارة التجارة.
              يحق لك استرجاع أي منتج خلال <strong>14 يومًا</strong> من تاريخ استلامه وفقًا للشروط التالية.
            </p>
          </div>

          {/* Section 1 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">01</span>
              حق الاسترجاع — Right to Return
            </h2>
            <div className="legal-content">
              <p>
                يحق لك إرجاع المنتج المشترى خلال <strong>14 يومًا</strong> من تاريخ الاستلام دون الحاجة إلى تقديم أي مبرر،
                شريطة أن يكون المنتج في حالته الأصلية وغير مستخدم وبعبوته الكاملة.
              </p>
              <ul className="legal-list">
                <li>المنتج لم يُفتح أو لم يُستخدم ولا يزال في عبوته الأصلية</li>
                <li>جميع الملحقات والوثائق والشهادات والهدايا المرفقة موجودة</li>
                <li>لا يوجد أي تلف أو خدش ناتج عن الاستخدام</li>
                <li>الطلب الأصلي يرفق مع المنتج عند الإرجاع</li>
              </ul>
            </div>
          </div>

          {/* Section 2 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">02</span>
              المنتجات المؤهلة للاسترجاع — Eligible Products
            </h2>
            <div className="legal-content">
              <div className="legal-grid">
                <div className="legal-card legal-card-green">
                  <span className="legal-card-icon">✅</span>
                  <h3>منتجات مؤهلة للإرجاع</h3>
                  <ul>
                    <li>الملابس وإكسسوارات الموضة</li>
                    <li>الأجهزة الإلكترونية والهواتف</li>
                    <li>المنتجات المنزلية والأجهزة</li>
                    <li>الألعاب ومنتجات الأطفال</li>
                    <li>المجوهرات والإكسسوارات</li>
                    <li>الأحذية والحقائب</li>
                  </ul>
                </div>
                <div className="legal-card legal-card-red">
                  <span className="legal-card-icon">❌</span>
                  <h3>منتجات غير مؤهلة للإرجاع</h3>
                  <ul>
                    <li>منتجات العناية الشخصية المفتوحة</li>
                    <li>مستحضرات التجميل المستخدمة</li>
                    <li>العطور المفتوحة</li>
                    <li>المنتجات المخصصة أو المُعدَّلة حسب الطلب</li>
                    <li>البضائع التالفة بسبب سوء الاستخدام</li>
                    <li>المنتجات المفقودة لعبواتها أو وثائقها الأصلية</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">03</span>
              إجراءات الإرجاع — Return Process
            </h2>
            <div className="legal-content">
              <div className="legal-steps">
                {[
                  {
                    num: '01',
                    title: 'تواصل معنا',
                    body: 'أرسل طلب الإرجاع خلال 14 يومًا من الاستلام عبر البريد الإلكتروني support@husin.org مع رقم الطلب وسبب الإرجاع وصور واضحة للمنتج.'
                  },
                  {
                    num: '02',
                    title: 'تأكيد الطلب',
                    body: 'سيتواصل معك فريقنا خلال 48 ساعة عمل لتأكيد أهلية المنتج للإرجاع وإرشادك لخطوات الشحن.'
                  },
                  {
                    num: '03',
                    title: 'شحن المنتج',
                    body: 'أرسل المنتج بعبوته الأصلية إلى العنوان الذي سنزودك به. تقع تكاليف شحن الإرجاع على عاتق العميل إلا في حالة المنتجات التالفة أو المعيبة.'
                  },
                  {
                    num: '04',
                    title: 'الاسترداد',
                    body: 'بعد استلام المنتج والتحقق منه، سيتم استرداد المبلغ كاملًا إلى وسيلة الدفع الأصلية خلال 5–10 أيام عمل.'
                  },
                ].map((step, i) => (
                  <div key={i} className="legal-step">
                    <div className="legal-step-num">{step.num}</div>
                    <div className="legal-step-body">
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">04</span>
              المنتجات التالفة أو المعيبة — Damaged or Defective Items
            </h2>
            <div className="legal-content">
              <div className="legal-highlight">
                <p>
                  إذا وصل المنتج تالفًا أو معيبًا أو مختلفًا عما تم طلبه، يرجى التواصل معنا فورًا خلال
                  <strong> 48 ساعة</strong> من الاستلام مع إرفاق صور واضحة للمنتج والتغليف.
                  في هذه الحالة، نتحمل تكاليف الشحن بالكامل ونضمن استبدال المنتج أو استرداد كامل المبلغ.
                </p>
              </div>
            </div>
          </div>

          {/* Section 5 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">05</span>
              سياسة الاسترداد المالي — Refund Policy
            </h2>
            <div className="legal-content">
              <table className="legal-table">
                <thead>
                  <tr>
                    <th>طريقة الدفع الأصلية</th>
                    <th>آلية الاسترداد</th>
                    <th>المدة الزمنية</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>بطاقة فيزا / ماستركارد</td>
                    <td>استرداد إلى البطاقة الأصلية عبر PayPal</td>
                    <td>5–10 أيام عمل</td>
                  </tr>
                  <tr>
                    <td>بطاقة مدى</td>
                    <td>استرداد إلى البطاقة الأصلية عبر PayPal</td>
                    <td>5–10 أيام عمل</td>
                  </tr>
                  <tr>
                    <td>Apple Pay</td>
                    <td>استرداد إلى حساب Apple Pay</td>
                    <td>3–7 أيام عمل</td>
                  </tr>
                  <tr>
                    <td>PayPal</td>
                    <td>استرداد فوري إلى رصيد PayPal</td>
                    <td>1–3 أيام عمل</td>
                  </tr>
                </tbody>
              </table>
              <p className="legal-note">
                ملاحظة: قد تتفاوت المدد الزمنية بحسب سياسات البنوك والمؤسسات المالية.
                لا تتحمل HUSIN مسؤولية أي تأخير من جانب البنك أو مزود الدفع.
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">06</span>
              الشحن الدولي — International Shipping Returns
            </h2>
            <div className="legal-content">
              <p>
                نظرًا لأن منتجات HUSIN Marketplace يتم توريدها من موردين دوليين وشحنها عبر شركات شحن دولية،
                قد يستغرق استلام مرتجعات الشحن الدولي من 7 إلى 21 يوم عمل. نحن ملتزمون بتطبيق سياسة الاسترداد
                فور التحقق من استلام المنتج المُرتجع في مستودع الشحن.
              </p>
              <ul className="legal-list">
                <li>يُعدّ إيصال تسليم شركة الشحن دليلًا على الإرجاع الناجح</li>
                <li>ستبدأ عملية الاسترداد خلال 48 ساعة من التأكيد</li>
                <li>لا تُحتسب أيام العطل الرسمية ضمن مدة المعالجة</li>
              </ul>
            </div>
          </div>

          {/* Contact */}
          <div className="legal-contact">
            <h2>تواصل مع فريق خدمة العملاء</h2>
            <p>لأي استفسار حول سياسة الاسترجاع أو لفتح طلب إرجاع، تواصل معنا عبر:</p>
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

        /* Header */
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

        /* Intro */
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

        /* Sections */
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

        /* List */
        .legal-list {
          padding-right: 20px;
          margin: 12px 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .legal-list li::marker { color: #c8a46d; }

        /* Cards grid */
        .legal-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .legal-card {
          border-radius: 12px;
          padding: 20px;
        }
        .legal-card h3 {
          color: #fff;
          font-size: 0.88rem;
          font-weight: 700;
          margin: 10px 0 14px;
        }
        .legal-card ul {
          padding-right: 16px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-size: 0.82rem;
        }
        .legal-card-icon { font-size: 1.4rem; }
        .legal-card-green {
          background: rgba(46,204,113,0.06);
          border: 1px solid rgba(46,204,113,0.15);
        }
        .legal-card-red {
          background: rgba(231,76,60,0.06);
          border: 1px solid rgba(231,76,60,0.15);
        }

        /* Steps */
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

        /* Highlight box */
        .legal-highlight {
          background: rgba(200,164,109,0.06);
          border: 1px solid rgba(200,164,109,0.18);
          border-radius: 10px;
          padding: 16px 20px;
        }
        .legal-highlight p { margin: 0; }

        /* Table */
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

        /* Note */
        .legal-note {
          color: rgba(255,255,255,0.35) !important;
          font-size: 0.78rem !important;
          font-style: italic;
        }

        /* Contact */
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

        /* Responsive */
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
