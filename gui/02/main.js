Terminal.add_theme('gruvbox_dark', '282828', 'ebdbb2');
Terminal.add_theme('gruvbox_light', 'fbf1c7', '3c3836');

const container = document.getElementById('container');
const terminal = new Terminal(container);
terminal.theme = 'gruvbox_light';

function line_handler(line) {
  terminal.write(terminal.prompt + line);
  terminal.read().then(line_handler);
}

terminal.read().then(line_handler);
