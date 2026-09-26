import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultLivingWell27SepBodies } from "../src/lib/email-campaigns/living-well-27-sep-html";
import { campaignEmailAssetUrl } from "../src/lib/email-campaigns/public-base";
import { LIVING_WELL_27_SEP_HEADLINE, LIVING_WELL_27_SEP_PREHEADER } from "../src/lib/email-campaigns/events";

const out = resolve(process.argv[2] || "tmp-living-well-27-sep-bodies.json");
const bodies = defaultLivingWell27SepBodies(campaignEmailAssetUrl("/logo.png"));
writeFileSync(
  out,
  JSON.stringify(
    {
      ...bodies,
      subjectEn: LIVING_WELL_27_SEP_HEADLINE.en,
      subjectEt: LIVING_WELL_27_SEP_HEADLINE.en,
      subjectRu: LIVING_WELL_27_SEP_HEADLINE.en,
      preheaderEn: LIVING_WELL_27_SEP_PREHEADER.en,
      preheaderEt: LIVING_WELL_27_SEP_PREHEADER.et,
      preheaderRu: LIVING_WELL_27_SEP_PREHEADER.ru,
    },
    null,
    2,
  ),
);
console.log(out);
