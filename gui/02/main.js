Terminal.add_theme('gruvbox_dark', '282828', 'ebdbb2');
Terminal.add_theme('gruvbox_light', 'fbf1c7', '3c3836');

const container = document.getElementById('container');
const terminal = new Terminal(container);
terminal.set_theme('gruvbox_light');

function handle_line(line) {
  terminal.write_line(terminal._line_prompt + line);

  let promise = terminal.prompt_line();
  promise.then(handle_line);
}

let promise = terminal.prompt_line();
promise.then(handle_line);
