import { TITLES } from "../config/constants";

export function getTitle(rate) {
  return TITLES.find((title) => rate >= title.min) ?? TITLES[TITLES.length - 1];
}
