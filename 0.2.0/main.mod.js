const updateButton = () => {
  const icon =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
        '<circle cx="12" cy="12" r="8" fill="none" stroke="white" stroke-width="2.5"/>' +
        '<circle cx="12" cy="12" r="4" fill="white"/>' +
      "</svg>"
    );

  button.innerHTML =
    '<img class="button-icon" src="' +
    icon +
    '"> ' +
    (enabled ? "Enabled" : "Disabled");
};
