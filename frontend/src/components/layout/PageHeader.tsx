import { useQuery } from "@tanstack/react-query";
import { Masthead } from "./Masthead";
import { getFrontPage } from "../../api/core/stories";
import { qk } from "../../lib/queryKeys";

/** Masthead for the inner pages, which show only the short date (1d/1g/1h/2a). */
export function PageHeader() {
  const { data } = useQuery({ queryKey: qk.frontPage, queryFn: getFrontPage });
  return <Masthead dateShort={data?.dateShort} editionNumber={data?.editionNumber} />;
}
