var darkTheme = true;
function setTheme() {
  if (darkTheme) {
    document.cookie = "dark_theme=1;max-age=2147483647";
    document.body.classList.remove("light_theme");
    document.body.classList.add("dark_theme");
  } else {
    document.cookie = "dark_theme=0;max-age=2147483647";
    document.body.classList.add("light_theme");
    document.body.classList.remove("dark_theme");
  }
}

var cookies = (document.cookie + ";").split(" ");
for (var i = 0; i < cookies.length; i++) {
  var cookie = cookies[i].split("=");
  if (cookie[0] == "dark_theme") {
    darkTheme = cookie[1] == "1;";
    break;
  }
}

var darkCheckbox = document.getElementById("dark_checkbox");
darkCheckbox.checked = darkTheme;
setTheme();

darkCheckbox.addEventListener("click", () => {
  darkTheme = darkCheckbox.checked;
  setTheme();
});
