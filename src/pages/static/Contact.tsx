import { StaticPage } from "./StaticPage";

/**
 * ⚠️ بيانات نائبة — غيّرها ببياناتك الفعلية قبل النشر:
 * البريد، وروابط السوشيال ميديا.
 */
const CONTACT_EMAIL = "your-email@example.com";
const SOCIAL_LINKS = [
  { label: "تويتر / X", url: "https://x.com/your-handle" },
  { label: "فيسبوك", url: "https://facebook.com/your-page" },
  { label: "يوتيوب", url: "https://youtube.com/@your-channel" },
];

export function Contact() {
  return (
    <StaticPage title="تواصل معنا">
      <p>
        لأي استفسار، اقتراح، أو مشكلة تقنية، تقدر تتواصل معنا عبر:
      </p>
      <p>
        البريد الإلكتروني:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      <h2>تابعنا</h2>
      <ul className="list-disc space-y-1 pe-5">
        {SOCIAL_LINKS.map((link) => (
          <li key={link.url}>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </StaticPage>
  );
}
