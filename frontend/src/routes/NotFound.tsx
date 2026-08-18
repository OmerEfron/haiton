import { PageHeader } from "../components/layout/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { ButtonLink } from "../components/ui/Button";
import { Footer } from "../components/layout/Footer";
import { common } from "../copy/common";

export function NotFound() {
  return (
    <>
      <PageHeader />
      <EmptyState
        title="העמוד הזה לא יצא לאור"
        body="הכתובת שביקשת לא קיימת בארכיון. אפשר לחזור לעמוד הראשי ולקרוא את המהדורה של היום."
        actions={<ButtonLink to="/" size="lg">{common.backHome}</ButtonLink>}
      />
      <Footer />
    </>
  );
}
