import { useQuery } from "@tanstack/react-query";
import styles from "./BriefsPage.module.css";
import { PageHeader } from "../components/layout/PageHeader";
import { SectionsBar } from "../components/layout/SectionsBar";
import { Footer } from "../components/layout/Footer";
import { FlashItem } from "../components/news/StoryPieces";
import { ErrorState, Loading } from "../components/ui/Bits";
import { EmptyState } from "../components/ui/EmptyState";
import { ButtonLink } from "../components/ui/Button";
import { listFlashes } from "../api/core/stories";
import { qk } from "../lib/queryKeys";
import { common } from "../copy/common";
import { desk } from "../copy/desk";

/* No mockup exists for this screen — the mobile tab bars in 1b and 2c link to
 * מבזקים, so it is built from the flashes list the front page already renders. */
export function BriefsPage() {
  const { data, isPending, error } = useQuery({ queryKey: qk.flashes, queryFn: listFlashes });

  return (
    <>
      <PageHeader />
      <SectionsBar active="flashes" />
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} />
      ) : data.flashes.length === 0 ? (
        <EmptyState
          title={desk.noFlashes}
          actions={
            <ButtonLink to="/interview" size="lg">
              {desk.startFirstInterview}
            </ButtonLink>
          }
        />
      ) : (
        <div className={styles.wrap}>
          <div className={styles.head}>
            <h1 className={styles.title}>{common.flashes}</h1>
            <p className={styles.intro}>מבזקים לפי שעה.</p>
          </div>
          <p className={styles.day}>{data.dateShort}</p>
          <div className={styles.list}>
            {data.flashes.map((flash) => (
              <FlashItem key={flash.id} flash={flash} />
            ))}
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}
