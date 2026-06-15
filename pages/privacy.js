/**
 * HUSIN NEXUS — /privacy
 * سياسة الخصوصية — Saudi PDPL Compliant
 */

import Head       from 'next/head'
import Navigation from '../components/navigation'
import Footer     from '../components/footer'

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>سياسة الخصوصية — HUSIN Nexus</title>
        <meta name="description" content="سياسة الخصوصية لمنصة HUSIN — حماية بياناتك الشخصية وفق نظام حماية البيانات الشخصية السعودي" />
        <meta name="robots" content="index, follow" />
      </Head>

      <Navigation />

      <div className="legal-page">
        <div className="legal-inner">

          <div className="legal-header">
            <div className="legal-badge">🔒 Privacy Policy</div>
            <h1 className="legal-title">سياسة الخصوصية</h1>
            <p className="legal-subtitle">Privacy Policy — PDPL Compliant</p>
            <div className="legal-meta">
              <span>آخر تحديث: يونيو 2026</span>
              <span className="legal-dot">·</span>
              <span>متوافقة مع نظام حماية البيانات الشخصية السعودي</span>
            </div>
          </div>

          <div className="legal-intro">
            <p>
              تلتزم منصة <strong>HUSIN Nexus</strong> التزامًا تامًا بحماية خصوصية مستخدميها وفقًا
              لأحكام <strong>نظام حماية البيانات الشخصية</strong> الصادر بالمرسوم الملكي رقم م/19
              وتاريخ 9/2/1443هـ واللوائح التنفيذية الصادرة عن الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا).
              هذه الوثيقة تشرح بالتفصيل ما نجمعه من بيانات، وكيف نستخدمها، وكيف نحميها.
            </p>
          </div>

          {/* Section 1 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">01</span>
              البيانات التي نجمعها — Data We Collect
            </h2>
            <div className="legal-content">
              <p>نجمع فئتين من البيانات عند تفاعلك مع المنصة:</p>
              <div className="legal-grid">
                <div className="legal-card" style={{background:'rgba(0,217,255,0.04)',border:'1px solid rgba(0,217,255,0.12)'}}>
                  <span className="legal-card-icon">👤</span>
                  <h3 style={{color:'#fff',marginTop:10,marginBottom:12,fontSize:'0.9rem',fontWeight:700}}>
                    البيانات التي تُقدمها أنت
                  </h3>
                  <ul className="legal-list" style={{fontSize:'0.83rem'}}>
                    <li>الاسم الكامل عند إتمام الشراء</li>
                    <li>عنوان البريد الإلكتروني</li>
                    <li>رقم الهاتف (اختياري)</li>
                    <li>عنوان التوصيل داخل المملكة</li>
                    <li>بيانات الدفع (معالجة بالكامل عبر PayPal — لا تصلنا بيانات البطاقة)</li>
                  </ul>
                </div>
                <div className="legal-card" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)'}}>
                  <span className="legal-card-icon">📊</span>
                  <h3 style={{color:'#fff',marginTop:10,marginBottom:12,fontSize:'0.9rem',fontWeight:700}}>
                    البيانات التقنية التلقائية
                  </h3>
                  <ul className="legal-list" style={{fontSize:'0.83rem'}}>
                    <li>عنوان IP (مجهّل جزئيًا)</li>
                    <li>نوع المتصفح ونظام التشغيل</li>
                    <li>الصفحات التي تمت زيارتها وترتيبها</li>
                    <li>وقت ومدة الجلسة</li>
                    <li>معرّف الجهاز (للحماية من الاحتيال)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">02</span>
              كيف نستخدم بياناتك — How We Use Your Data
            </h2>
            <div className="legal-content">
              <p>نستخدم بياناتك الشخصية للأغراض التالية حصرًا، ولا نستخدمها لأي غرض آخر دون موافقتك:</p>
              <div className="legal-steps">
                {[
                  { icon:'🛒', title:'معالجة الطلبات', body:'معالجة طلبات الشراء، تأكيد الدفع، تنسيق التوصيل إلى عنوانك.' },
                  { icon:'📧', title:'التواصل معك', body:'إرسال تأكيدات الطلبات وتحديثات التوصيل والرد على استفساراتك.' },
                  { icon:'🔒', title:'الأمن والحماية', body:'الكشف عن محاولات الاحتيال وحماية حسابك وبياناتك.' },
                  { icon:'⚖️', title:'الامتثال القانوني', body:'الوفاء بالتزاماتنا تجاه الجهات التنظيمية السعودية عند الاقتضاء.' },
                  { icon:'📈', title:'تحسين الخدمة', body:'تحليل أنماط الاستخدام المجمّعة (غير المرتبطة بهويتك) لتحسين المنصة.' },
                ].map((item, i) => (
                  <div key={i} className="legal-step">
                    <div className="legal-step-num">{item.icon}</div>
                    <div className="legal-step-body">
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">03</span>
              تخزين البيانات وحمايتها — Data Storage & Security
            </h2>
            <div className="legal-content">
              <div className="legal-highlight">
                <p style={{fontWeight:600,color:'#fff',marginBottom:10}}>
                  🔐 بنيتنا التقنية الأمنية
                </p>
                <p>
                  تُخزَّن جميع البيانات الشخصية في قاعدة بيانات <strong>Google Firebase Firestore</strong>
                  المشفّرة بمعيار <strong>AES-256</strong> أثناء الحفظ، و<strong>TLS 1.3</strong> أثناء النقل.
                  تقع خوادم Firebase في مراكز بيانات Google المعتمدة بمعايير <strong>ISO 27001</strong>.
                </p>
              </div>
              <br />
              <p>ضمانات الأمان التي نطبقها:</p>
              <ul className="legal-list">
                <li>لا تمر بيانات بطاقات الدفع عبر خوادمنا أبدًا — تُعالَج مباشرة بواسطة PayPal (PCI-DSS Level 1)</li>
                <li>يتمتع بصلاحية الوصول لبياناتك مسؤول النظام فقط عبر Firebase Admin SDK المُقيَّد</li>
                <li>جميع الاتصالات تتم عبر HTTPS/TLS مع شهادة SSL سارية</li>
                <li>لا يُسمح بأي وصول مباشر لقاعدة البيانات من العميل (المتصفح)</li>
                <li>يتم مراجعة صلاحيات الوصول دوريًا</li>
              </ul>
            </div>
          </div>

          {/* Section 4 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">04</span>
              مشاركة البيانات مع الأطراف الثالثة — Third-Party Sharing
            </h2>
            <div className="legal-content">
              <div className="legal-highlight" style={{background:'rgba(46,204,113,0.05)',borderColor:'rgba(46,204,113,0.15)'}}>
                <p style={{color:'#2ecc71',fontWeight:700,marginBottom:8}}>
                  ✅ نحن لا نبيع بياناتك الشخصية ولا نتاجر بها
                </p>
                <p>
                  لا تُباع بياناتك الشخصية ولا تُؤجَّر ولا تُشارَك مع أطراف ثالثة لأغراض تسويقية.
                </p>
              </div>
              <br />
              <p>نشارك بياناتك فقط مع الأطراف التالية عند الضرورة:</p>
              <table className="legal-table">
                <thead>
                  <tr>
                    <th>الطرف الثالث</th>
                    <th>الغرض</th>
                    <th>البيانات المشاركة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>PayPal</td>
                    <td>معالجة الدفع الإلكتروني</td>
                    <td>مبلغ الطلب، العملة</td>
                  </tr>
                  <tr>
                    <td>Google Firebase</td>
                    <td>التخزين الآمن للبيانات</td>
                    <td>جميع البيانات المشفرة</td>
                  </tr>
                  <tr>
                    <td>Vercel</td>
                    <td>استضافة المنصة وتشغيلها</td>
                    <td>بيانات الجلسة التقنية</td>
                  </tr>
                  <tr>
                    <td>الجهات التنظيمية السعودية</td>
                    <td>الامتثال القانوني فقط</td>
                    <td>عند الطلب الرسمي المُعتمَد</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">05</span>
              حقوقك بموجب نظام PDPL — Your Rights Under PDPL
            </h2>
            <div className="legal-content">
              <p>يكفل لك نظام حماية البيانات الشخصية السعودي الحقوق التالية:</p>
              <div className="legal-grid">
                {[
                  { icon:'👁️', title:'حق الاطلاع', body:'طلب الاطلاع على البيانات الشخصية التي نحتفظ بها عنك.' },
                  { icon:'✏️', title:'حق التصحيح', body:'طلب تصحيح أي بيانات غير دقيقة أو مكتملة.' },
                  { icon:'🗑️', title:'حق الحذف', body:'طلب حذف بياناتك الشخصية عند انتفاء الغرض من معالجتها.' },
                  { icon:'📤', title:'حق النقل', body:'طلب نقل بياناتك إلى مزود خدمة آخر بصيغة إلكترونية.' },
                ].map((item, i) => (
                  <div key={i} className="legal-card" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)'}}>
                    <span style={{fontSize:'1.4rem'}}>{item.icon}</span>
                    <h3 style={{color:'#fff',fontSize:'0.88rem',fontWeight:700,margin:'10px 0 8px'}}>{item.title}</h3>
                    <p style={{fontSize:'0.82rem',lineHeight:1.65}}>{item.body}</p>
                  </div>
                ))}
              </div>
              <br />
              <p>لممارسة أي من هذه الحقوق، تواصل معنا على: <strong style={{color:'#00d9ff'}}>privacy@husin.org</strong></p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">06</span>
              ملفات تعريف الارتباط — Cookies
            </h2>
            <div className="legal-content">
              <p>
                نستخدم ملفات تعريف الارتباط (Cookies) الضرورية فقط لضمان عمل المنصة بشكل صحيح،
                مثل حفظ جلسة المستخدم وإعدادات اللغة. لا نستخدم ملفات تعريف الارتباط التتبعية
                أو الإعلانية دون موافقتك الصريحة.
              </p>
            </div>
          </div>

          {/* Section 7 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">07</span>
              مدة الاحتفاظ بالبيانات — Data Retention
            </h2>
            <div className="legal-content">
              <table className="legal-table">
                <thead>
                  <tr>
                    <th>نوع البيانات</th>
                    <th>مدة الاحتفاظ</th>
                    <th>سبب الاحتفاظ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>بيانات الطلبات</td>
                    <td>5 سنوات</td>
                    <td>المتطلبات الضريبية والمحاسبية</td>
                  </tr>
                  <tr>
                    <td>بيانات التواصل</td>
                    <td>3 سنوات</td>
                    <td>سجل خدمة العملاء</td>
                  </tr>
                  <tr>
                    <td>البيانات التقنية</td>
                    <td>90 يومًا</td>
                    <td>الأمن ومنع الاحتيال</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 8 */}
          <div className="legal-section">
            <h2 className="legal-section-title">
              <span className="legal-num">08</span>
              التواصل مع مسؤول حماية البيانات — DPO Contact
            </h2>
            <div className="legal-content">
              <p>
                لأي استفسار يتعلق بخصوصيتك أو لممارسة حقوقك المكفولة بموجب نظام PDPL،
                يرجى التواصل مع مسؤول حماية البيانات عبر:
              </p>
            </div>
          </div>

          <div className="legal-contact">
            <h2>مسؤول حماية البيانات — Data Protection Officer</h2>
            <p>HUSIN Nexus · المملكة العربية السعودية</p>
            <div className="legal-contact-grid">
              <a href="mailto:privacy@husin.org" className="legal-contact-item">
                <span>📧</span><span>privacy@husin.org</span>
              </a>
              <a href="mailto:support@husin.org" className="legal-contact-item">
                <span>💬</span><span>support@husin.org</span>
              </a>
            </div>
          </div>

        </div>
      </div>

      <Footer />

      <style jsx global>{`
        .legal-page { background:#050608; min-height:100vh; padding:0 0 80px; font-family:'Roboto','Noto Sans Arabic',system-ui,sans-serif; color:#f4f5f7; direction:rtl; }
        .legal-inner { max-width:900px; margin:0 auto; padding:0 24px; }
        .legal-header { text-align:center; padding:60px 0 40px; border-bottom:1px solid rgba(255,255,255,0.07); margin-bottom:48px; }
        .legal-badge { display:inline-block; background:rgba(200,164,109,0.1); border:1px solid rgba(200,164,109,0.25); color:#c8a46d; padding:5px 16px; border-radius:20px; font-size:0.8rem; font-weight:600; margin-bottom:16px; direction:ltr; }
        .legal-title { color:#fff; font-size:clamp(1.6rem,4vw,2.4rem); font-weight:700; margin:0 0 6px; line-height:1.3; }
        .legal-subtitle { color:rgba(255,255,255,0.4); font-size:1rem; margin:0 0 16px; direction:ltr; }
        .legal-meta { color:rgba(255,255,255,0.3); font-size:0.8rem; display:flex; align-items:center; justify-content:center; gap:10px; flex-wrap:wrap; }
        .legal-dot { opacity:0.4; }
        .legal-intro { background:rgba(0,217,255,0.04); border:1px solid rgba(0,217,255,0.12); border-radius:12px; padding:20px 24px; margin-bottom:40px; font-size:0.95rem; line-height:1.8; color:rgba(255,255,255,0.75); }
        .legal-section { margin-bottom:44px; padding-bottom:44px; border-bottom:1px solid rgba(255,255,255,0.06); }
        .legal-section:last-of-type { border-bottom:none; }
        .legal-section-title { color:#fff; font-size:1.15rem; font-weight:700; margin:0 0 20px; display:flex; align-items:center; gap:12px; }
        .legal-num { background:rgba(200,164,109,0.1); border:1px solid rgba(200,164,109,0.2); color:#c8a46d; font-size:0.7rem; font-weight:800; padding:3px 9px; border-radius:20px; direction:ltr; flex-shrink:0; }
        .legal-content { color:rgba(255,255,255,0.65); font-size:0.9rem; line-height:1.85; }
        .legal-content p { margin:0 0 14px; }
        .legal-content p:last-child { margin:0; }
        .legal-list { padding-right:20px; margin:12px 0; display:flex; flex-direction:column; gap:8px; }
        .legal-list li::marker { color:#c8a46d; }
        .legal-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .legal-card { border-radius:12px; padding:20px; }
        .legal-highlight { background:rgba(200,164,109,0.06); border:1px solid rgba(200,164,109,0.18); border-radius:10px; padding:16px 20px; }
        .legal-highlight p { margin:0 0 8px; }
        .legal-highlight p:last-child { margin:0; }
        .legal-steps { display:flex; flex-direction:column; gap:12px; }
        .legal-step { display:flex; gap:14px; align-items:flex-start; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:14px 18px; }
        .legal-step-num { width:36px; height:36px; border-radius:50%; background:rgba(200,164,109,0.1); border:1px solid rgba(200,164,109,0.25); color:#c8a46d; font-size:1rem; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .legal-step-body h3 { color:#fff; font-size:0.88rem; font-weight:700; margin:0 0 5px; }
        .legal-step-body p { color:rgba(255,255,255,0.55); font-size:0.82rem; line-height:1.65; margin:0; }
        .legal-table { width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:14px; direction:rtl; }
        .legal-table th { background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.5); font-size:0.72rem; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.08); text-align:right; }
        .legal-table td { padding:11px 14px; border-bottom:1px solid rgba(255,255,255,0.05); color:rgba(255,255,255,0.7); }
        .legal-table tr:hover td { background:rgba(255,255,255,0.02); }
        .legal-note { color:rgba(255,255,255,0.35) !important; font-size:0.78rem !important; font-style:italic; }
        .legal-contact { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:32px; text-align:center; margin-top:48px; }
        .legal-contact h2 { color:#fff; font-size:1.1rem; font-weight:700; margin:0 0 10px; }
        .legal-contact p { color:rgba(255,255,255,0.45); font-size:0.88rem; margin:0 0 20px; }
        .legal-contact-grid { display:flex; justify-content:center; gap:14px; flex-wrap:wrap; }
        .legal-contact-item { display:flex; align-items:center; gap:8px; background:rgba(0,217,255,0.07); border:1px solid rgba(0,217,255,0.2); color:#00d9ff; padding:10px 20px; border-radius:10px; text-decoration:none; font-size:0.875rem; font-weight:500; transition:background 0.2s; direction:ltr; }
        .legal-contact-item:hover { background:rgba(0,217,255,0.12); }
        @media(max-width:640px) {
          .legal-inner { padding:0 16px; }
          .legal-header { padding:40px 0 28px; }
          .legal-title { font-size:1.4rem; }
          .legal-grid { grid-template-columns:1fr; }
          .legal-table { font-size:0.78rem; }
          .legal-table th,.legal-table td { padding:8px 10px; }
          .legal-contact { padding:22px 18px; }
        }
      `}</style>
    </>
  )
}
