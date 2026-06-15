/**
 * HUSIN NEXUS — /terms
 * الشروط والأحكام — Terms of Service
 * Saudi E-Commerce Law Compliant
 */

import Head       from 'next/head'
import Navigation from '../components/navigation'
import Footer     from '../components/footer'

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>الشروط والأحكام — HUSIN Nexus</title>
        <meta name="description" content="الشروط والأحكام لاستخدام منصة HUSIN Nexus للتسوق الإلكتروني في المملكة العربية السعودية" />
        <meta name="robots" content="index, follow" />
      </Head>

      <Navigation />

      <div className="legal-page">
        <div className="legal-inner">

          <div className="legal-header">
            <div className="legal-badge">⚖️ Terms of Service</div>
            <h1 className="legal-title">الشروط والأحكام</h1>
            <p className="legal-subtitle">Terms & Conditions of Use</p>
            <div className="legal-meta">
              <span>آخر تحديث: يونيو 2026</span>
              <span className="legal-dot">·</span>
              <span>تسري على جميع مستخدمي husin.org</span>
            </div>
          </div>

          <div className="legal-intro">
            <p>
              مرحبًا بك في <strong>HUSIN Nexus</strong>. باستخدامك لمنصتنا أو الشراء من خلالها،
              فإنك توافق على الالتزام بالشروط والأحكام التالية. يُرجى قراءتها بعناية قبل إتمام
              أي عملية شراء. تخضع هذه الشروط لأحكام <strong>نظام التجارة الإلكترونية</strong> السعودي
              الصادر بالمرسوم الملكي رقم م/126 لعام 1441هـ.
            </p>
          </div>

          {/* Section 1 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">01</span>
              تعريف المنصة وطبيعة الخدمة
            </h2>
            <div className="legal-content">
              <p>
                <strong>HUSIN Nexus</strong> هي منصة تجارة إلكترونية متكاملة تعمل بنموذج
                <strong> الدروبشيبينغ المُعتمَد</strong> (Curated Dropshipping)، حيث تقوم المنصة بما يلي:
              </p>
              <ul className="legal-list">
                <li>اختيار المنتجات من موردين دوليين موثوقين وعرضها على المنصة بعد التحقق من جودتها</li>
                <li>استلام طلبات العملاء ومعالجة مدفوعاتهم بشكل آمن</li>
                <li>توريد المنتجات من الموردين وشحنها مباشرة إلى عنوان العميل في المملكة العربية السعودية</li>
                <li>تقديم خدمة ما بعد البيع ودعم العملاء</li>
              </ul>
              <p>
                تعمل المنصة كوسيط بين العميل والمورد الدولي. جميع المنتجات المعروضة جديدة
                وغير مستخدمة وتم التحقق منها قبل الموافقة على عرضها.
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">02</span>
              شروط الاستخدام — Acceptable Use
            </h2>
            <div className="legal-content">
              <p>بموافقتك على هذه الشروط، تُقرّ بما يلي:</p>
              <div className="legal-grid">
                <div className="legal-card" style={{background:'rgba(46,204,113,0.05)',border:'1px solid rgba(46,204,113,0.12)'}}>
                  <span style={{fontSize:'1.3rem'}}>✅</span>
                  <h3 style={{color:'#fff',fontSize:'0.88rem',fontWeight:700,margin:'10px 0 10px'}}>
                    يُسمح بـ
                  </h3>
                  <ul className="legal-list" style={{fontSize:'0.82rem'}}>
                    <li>تصفح المنتجات والشراء للاستخدام الشخصي</li>
                    <li>إنشاء حساب بمعلومات حقيقية ودقيقة</li>
                    <li>التواصل مع الدعم لأغراض مشروعة</li>
                    <li>مشاركة روابط المنتجات مع الآخرين</li>
                  </ul>
                </div>
                <div className="legal-card" style={{background:'rgba(231,76,60,0.05)',border:'1px solid rgba(231,76,60,0.12)'}}>
                  <span style={{fontSize:'1.3rem'}}>❌</span>
                  <h3 style={{color:'#fff',fontSize:'0.88rem',fontWeight:700,margin:'10px 0 10px'}}>
                    محظور تمامًا
                  </h3>
                  <ul className="legal-list" style={{fontSize:'0.82rem'}}>
                    <li>إدخال بيانات مزيفة أو انتحال هوية الغير</li>
                    <li>محاولة اختراق المنصة أو نظام الدفع</li>
                    <li>إساءة استخدام سياسة الاسترجاع</li>
                    <li>إعادة بيع المنتجات دون إذن مسبق</li>
                    <li>استخدام بيانات اعتماد مسروقة أو احتيالية</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">03</span>
              الأسعار والدفع — Pricing & Payment
            </h2>
            <div className="legal-content">
              <ul className="legal-list">
                <li>
                  جميع الأسعار المعروضة بالريال السعودي (SAR) وتشمل ضريبة القيمة المضافة
                  حيث ينطبق ذلك وفق الأنظمة السعودية
                </li>
                <li>
                  تحتفظ المنصة بحق تعديل الأسعار في أي وقت نتيجة تغيّر أسعار الموردين،
                  ولن يؤثر ذلك على الطلبات المؤكَّدة والمدفوعة
                </li>
                <li>
                  تُعالَج المدفوعات عبر <strong>PayPal</strong> وتدعم جميع بطاقات الائتمان
                  (Visa، Mastercard، Amex) وبطاقة مدى وApple Pay
                </li>
                <li>
                  بطاقات الدفع لا تمر عبر خوادم HUSIN — تُعالَج مباشرة عبر بنية PayPal
                  المتوافقة مع معيار PCI-DSS
                </li>
                <li>
                  يُعدّ الطلب مؤكَّدًا وملزمًا لكلا الطرفين فور نجاح عملية الدفع والحصول
                  على رقم طلب
                </li>
              </ul>
            </div>
          </div>

          {/* Section 4 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">04</span>
              الشحن والتوصيل — Shipping & Delivery
            </h2>
            <div className="legal-content">
              <table className="legal-table">
                <thead>
                  <tr>
                    <th>نوع الشحن</th>
                    <th>المدة المتوقعة</th>
                    <th>التغطية</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>شحن دولي قياسي</td>
                    <td>7–21 يوم عمل</td>
                    <td>جميع مدن المملكة</td>
                  </tr>
                  <tr>
                    <td>شحن دولي سريع</td>
                    <td>3–7 أيام عمل</td>
                    <td>المدن الرئيسية</td>
                  </tr>
                </tbody>
              </table>
              <ul className="legal-list">
                <li>مدة التوصيل تعتمد على المورد وشركة الشحن وجمارك المملكة</li>
                <li>تُحتسب المدة من تاريخ تأكيد الطلب وبدء الشحن من المورد</li>
                <li>سيتم إخطارك برقم تتبع الشحنة فور توفّره</li>
                <li>لا تتحمل HUSIN مسؤولية التأخيرات الناجمة عن إجراءات الجمارك</li>
              </ul>
            </div>
          </div>

          {/* Section 5 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">05</span>
              ضمان المنتجات وجودتها — Product Warranty & Quality
            </h2>
            <div className="legal-content">
              <div className="legal-highlight">
                <p style={{fontWeight:600,color:'#fff',marginBottom:8}}>
                  🛡️ ضمان جودة HUSIN
                </p>
                <p>
                  تمر جميع المنتجات المعروضة على منصة HUSIN بعملية فرز وتحقق آلي دقيق.
                  نقبل فقط المنتجات الجديدة كليًا (New) ذات التفاصيل الكاملة والصور الواضحة.
                  المنتجات المستعملة أو المُجدَّدة مرفوضة تمامًا من نظامنا.
                </p>
              </div>
              <br />
              <p>
                تخضع المنتجات لضمان المورد الأصلي. يُرجى الرجوع إلى سياسة الاسترجاع للاطلاع
                على حقوقك في حالة وصول منتج معيب أو تالف.
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">06</span>
              حدود المسؤولية — Limitation of Liability
            </h2>
            <div className="legal-content">
              <p>
                في حدود ما يسمح به القانون السعودي، تقتصر مسؤولية HUSIN Nexus على:
              </p>
              <ul className="legal-list">
                <li>
                  استرداد كامل مبلغ الشراء في حالات العيوب المُثبَتة أو عدم التوصيل
                </li>
                <li>
                  لا تتحمل المنصة مسؤولية الأضرار غير المباشرة أو خسارة الأرباح أو
                  الأضرار التبعية الناجمة عن استخدام المنتجات
                </li>
                <li>
                  لا تتحمل المنصة مسؤولية تأخيرات الشحن الناجمة عن ظروف قاهرة أو
                  قرارات جمركية أو أعطال شركات الشحن
                </li>
                <li>
                  مسؤوليتنا الإجمالية في جميع الأحوال لا تتجاوز مبلغ الطلب المدفوع
                </li>
              </ul>
            </div>
          </div>

          {/* Section 7 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">07</span>
              الملكية الفكرية — Intellectual Property
            </h2>
            <div className="legal-content">
              <p>
                جميع محتويات منصة HUSIN Nexus — بما يشمل التصميم، الشعارات، النصوص،
                الواجهات، وهيكل النظام — هي ملك حصري لشركة HUSIN Nexus ومحمية بموجب
                أنظمة الملكية الفكرية السعودية والدولية. يُحظر نسخ أي جزء منها أو
                استخدامه تجاريًا دون إذن كتابي مسبق.
              </p>
            </div>
          </div>

          {/* Section 8 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">08</span>
              تعديل الشروط — Amendments
            </h2>
            <div className="legal-content">
              <p>
                تحتفظ HUSIN Nexus بحق تعديل هذه الشروط في أي وقت. سيتم إخطار المستخدمين
                بالتعديلات الجوهرية عبر البريد الإلكتروني أو عبر إشعار بارز على المنصة
                قبل 15 يومًا من سريانها. استمرارك في استخدام المنصة بعد سريان التعديلات
                يُعدّ قبولًا ضمنيًا لها.
              </p>
            </div>
          </div>

          {/* Section 9 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">09</span>
              القانون الحاكم وتسوية النزاعات — Governing Law
            </h2>
            <div className="legal-content">
              <p>
                تخضع هذه الشروط والأحكام لأحكام <strong>نظام التجارة الإلكترونية السعودي</strong>
                ونظام المعاملات التجارية الإلكترونية وما يصدر بشأنهما من لوائح تنفيذية.
                في حالة أي نزاع، يتم اللجوء أولًا إلى التسوية الودية خلال 30 يومًا،
                وعند تعذّر ذلك تُحال النزاعات إلى <strong>المحاكم التجارية السعودية المختصة</strong>.
              </p>
            </div>
          </div>

          {/* Section 10 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">10</span>
              حقوق المستهلك — Consumer Rights
            </h2>
            <div className="legal-content">
              <p>
                تلتزم HUSIN Nexus بجميع حقوق المستهلك المكفولة بموجب
                <strong> نظام حماية المستهلك</strong> السعودي الصادر بالمرسوم الملكي رقم م/25
                لعام 1437هـ، بما يشمل:
              </p>
              <div className="legal-steps">
                {[
                  { num:'أولًا', title:'الحق في المعلومة', body:'حقك في الحصول على معلومات كاملة ودقيقة عن المنتج قبل الشراء، بما يشمل المواصفات والسعر وشروط التوصيل.' },
                  { num:'ثانيًا', title:'الحق في الاختيار', body:'حقك في اختيار المنتج المناسب دون ضغط أو ممارسات تجارية مضللة.' },
                  { num:'ثالثًا', title:'الحق في الإرجاع', body:'حقك في إرجاع المنتج خلال 14 يومًا وفق الشروط المنصوص عليها في سياسة الاسترجاع.' },
                  { num:'رابعًا', title:'الحق في التظلم', body:'حقك في تقديم شكوى لدى هيئة حماية المستهلك (GCAM) على الرقم الموحد 1900.' },
                ].map((item, i) => (
                  <div key={i} className="legal-step">
                    <div className="legal-step-num" style={{fontSize:'0.65rem',width:40,height:40}}>
                      {item.num}
                    </div>
                    <div className="legal-step-body">
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="legal-contact">
            <h2>للتواصل والاستفسار</h2>
            <p>فريق HUSIN Nexus متاح للرد على استفساراتك</p>
            <div className="legal-contact-grid">
              <a href="mailto:support@husin.org" className="legal-contact-item">
                <span>📧</span><span>support@husin.org</span>
              </a>
              <a href="https://t.me/HusinSupport" className="legal-contact-item">
                <span>💬</span><span>Telegram Support</span>
              </a>
              <a href="tel:1900" className="legal-contact-item">
                <span>📞</span><span>GCAM: 1900</span>
              </a>
            </div>
          </div>

        </div>
      </div>

      <Footer />

      <style jsx global>{`
        .legal-page{background:#050608;min-height:100vh;padding:0 0 80px;font-family:'Roboto','Noto Sans Arabic',system-ui,sans-serif;color:#f4f5f7;direction:rtl}
        .legal-inner{max-width:900px;margin:0 auto;padding:0 24px}
        .legal-header{text-align:center;padding:60px 0 40px;border-bottom:1px solid rgba(255,255,255,0.07);margin-bottom:48px}
        .legal-badge{display:inline-block;background:rgba(200,164,109,0.1);border:1px solid rgba(200,164,109,0.25);color:#c8a46d;padding:5px 16px;border-radius:20px;font-size:0.8rem;font-weight:600;margin-bottom:16px;direction:ltr}
        .legal-title{color:#fff;font-size:clamp(1.6rem,4vw,2.4rem);font-weight:700;margin:0 0 6px;line-height:1.3}
        .legal-subtitle{color:rgba(255,255,255,0.4);font-size:1rem;margin:0 0 16px;direction:ltr}
        .legal-meta{color:rgba(255,255,255,0.3);font-size:0.8rem;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}
        .legal-dot{opacity:0.4}
        .legal-intro{background:rgba(0,217,255,0.04);border:1px solid rgba(0,217,255,0.12);border-radius:12px;padding:20px 24px;margin-bottom:40px;font-size:0.95rem;line-height:1.8;color:rgba(255,255,255,0.75)}
        .legal-section{margin-bottom:44px;padding-bottom:44px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .legal-section:last-of-type{border-bottom:none}
        .legal-section-title{color:#fff;font-size:1.15rem;font-weight:700;margin:0 0 20px;display:flex;align-items:center;gap:12px}
        .legal-num{background:rgba(200,164,109,0.1);border:1px solid rgba(200,164,109,0.2);color:#c8a46d;font-size:0.7rem;font-weight:800;padding:3px 9px;border-radius:20px;direction:ltr;flex-shrink:0}
        .legal-content{color:rgba(255,255,255,0.65);font-size:0.9rem;line-height:1.85}
        .legal-content p{margin:0 0 14px}
        .legal-content p:last-child{margin:0}
        .legal-list{padding-right:20px;margin:12px 0;display:flex;flex-direction:column;gap:8px}
        .legal-list li::marker{color:#c8a46d}
        .legal-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .legal-card{border-radius:12px;padding:20px}
        .legal-highlight{background:rgba(200,164,109,0.06);border:1px solid rgba(200,164,109,0.18);border-radius:10px;padding:16px 20px}
        .legal-highlight p{margin:0 0 8px}
        .legal-highlight p:last-child{margin:0}
        .legal-steps{display:flex;flex-direction:column;gap:12px}
        .legal-step{display:flex;gap:14px;align-items:flex-start;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px 18px}
        .legal-step-num{width:36px;height:36px;border-radius:50%;background:rgba(200,164,109,0.1);border:1px solid rgba(200,164,109,0.25);color:#c8a46d;font-size:0.7rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;direction:rtl;text-align:center}
        .legal-step-body h3{color:#fff;font-size:0.88rem;font-weight:700;margin:0 0 5px}
        .legal-step-body p{color:rgba(255,255,255,0.55);font-size:0.82rem;line-height:1.65;margin:0}
        .legal-table{width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:14px;direction:rtl}
        .legal-table th{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);font-size:0.72rem;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right}
        .legal-table td{padding:11px 14px;border-bottom:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.7)}
        .legal-table tr:hover td{background:rgba(255,255,255,0.02)}
        .legal-contact{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;text-align:center;margin-top:48px}
        .legal-contact h2{color:#fff;font-size:1.1rem;font-weight:700;margin:0 0 10px}
        .legal-contact p{color:rgba(255,255,255,0.45);font-size:0.88rem;margin:0 0 20px}
        .legal-contact-grid{display:flex;justify-content:center;gap:14px;flex-wrap:wrap}
        .legal-contact-item{display:flex;align-items:center;gap:8px;background:rgba(0,217,255,0.07);border:1px solid rgba(0,217,255,0.2);color:#00d9ff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:0.875rem;font-weight:500;transition:background 0.2s;direction:ltr}
        .legal-contact-item:hover{background:rgba(0,217,255,0.12)}
        @media(max-width:640px){
          .legal-inner{padding:0 16px}
          .legal-header{padding:40px 0 28px}
          .legal-title{font-size:1.4rem}
          .legal-grid{grid-template-columns:1fr}
          .legal-table{font-size:0.78rem}
          .legal-table th,.legal-table td{padding:8px 10px}
          .legal-contact{padding:22px 18px}
        }
      `}</style>
    </>
  )
}
