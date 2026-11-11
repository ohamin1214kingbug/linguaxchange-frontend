// Which part of the world a country is in, by ISO code. Used by the admin
// page to group members; pure, so it can be tested without the country-name
// files lib/countries.js loads.
//
// Nine groups. The first version had five continents, which put Korea with
// India and the United States with Brazil: for a language exchange those are
// different communities. Europe stays whole, since most members are there
// and no split of it is as obvious.
//
// "Middle East" follows the UN's Western Asia, so it includes Turkey and the
// Caucasus. "Latin America" includes Mexico and the Caribbean.
const CODES = {
  Europe: 'AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK',
  'Middle East': 'AE AM AZ BH GE IL IQ IR JO KW LB OM PS QA SA SY TR YE',
  'East Asia': 'CN HK JP KP KR MN MO TW',
  'South and Southeast Asia': 'AF BD BN BT ID IN KH LA LK MM MV MY NP PH PK SG TH TL VN',
  'Central Asia': 'KG KZ TJ TM UZ',
  'North America': 'BM CA GL PM US',
  'Latin America': 'AG AI AR AW BB BL BO BQ BR BS BZ CL CO CR CU CW DM DO EC FK GD GF GP GT GY HN HT JM KN KY LC MF MQ MS MX NI PA PE PR PY SR SV SX TC TT UY VC VE VG VI',
  Africa: 'AC AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TA TD TG TN TZ UG YT ZA ZM ZW',
  Oceania: 'AS AU CC CK CX FJ FM GU KI MH MP NC NF NR NU NZ PF PG PW SB TK TO TV VU WF WS',
}

// Display order. "Other" is last and catches a code not listed above, or a
// member with no nationality.
export const REGIONS = [...Object.keys(CODES), 'Other']

const REGION_BY_CODE = Object.fromEntries(
  Object.entries(CODES).flatMap(([region, codes]) => codes.split(' ').map(code => [code, region]))
)

export function regionOfCode(code) {
  return REGION_BY_CODE[code] || 'Other'
}
