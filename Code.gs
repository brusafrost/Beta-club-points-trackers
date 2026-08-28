function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Beta Club Tracker')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
