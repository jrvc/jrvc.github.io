document.addEventListener("DOMContentLoaded", () => {
  fetch("assets/data/publications.json")
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById("publications-list");
      container.innerHTML = ""; // Clear "Loading..." text
      let currentYear = "";

      data.forEach(pub => {
        // Add year header if it changes
        if (pub.year !== currentYear) {
          currentYear = pub.year;
          const yearHeader = document.createElement("div");
          yearHeader.className = "pub-year";
          yearHeader.textContent = `[${currentYear}]`;
          container.appendChild(yearHeader);
        }

        // Create publication item
        const item = document.createElement("div");
        item.className = "pub-item";
        item.innerHTML = `
          <p>${pub.authors.join(", ")}. 
          <a href="${pub.link}" target="_blank">${pub.title}</a> 
          <em>${pub.journal}</em></p>`;
        container.appendChild(item);
      });
    })
    .catch(error => {
      console.error("Error loading publications:", error);
      document.getElementById("publications-list").innerHTML = "<p>Failed to load publications.</p>";
    });
});
