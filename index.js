function saveToGoogleSheet(data) {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  
  return axios.post(scriptUrl, data)
    .then(response => {
      console.log("Data saved to Google Sheet:", response.data);
      return response.data;
    })
    .catch(error => {
      console.error("Error saving to Google Sheet:", error);
      return null;
    });
}
