// Which part of the world a country is in, by ISO code. Used by the admin
// page to group members; pure, so it can be tested without the country-name
// files lib/countries.js loads.
//
// Five groups, not the UN's finer ones: with a few dozen members, "Europe"
// and "Asia" are useful headings and "Southern Europe" is not.
const CODES = {
  Europe: 'AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK',
  Asia: 'AE AF AM AZ BD BH BN BT CN GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE',
  Americas: 'AG AI AR AW BB BL BM BO BQ BR BS BZ CA CL CO CR CU CW DM DO EC FK GD GF GL GP GT GY HN HT JM KN KY LC MF MQ MS MX NI PA PE PM PR PY SR SV SX TC TT US UY VC VE VG VI',
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
