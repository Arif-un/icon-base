export function syncWpBackground(): void {
  const adminMenuBack = document.getElementById("adminmenuback");
  if (!adminMenuBack) return;

  const backgroundColor = window
    .getComputedStyle(adminMenuBack)
    .getPropertyValue("background-color");
  if (!backgroundColor) return;

  const wpWrap = document.getElementById("wpwrap");
  if (wpWrap) {
    wpWrap.style.backgroundColor = backgroundColor;
  }
  adminMenuBack.style.backgroundColor = "transparent";
}
