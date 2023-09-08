// wait for the page to load
addEventListener("DOMContentLoaded", function () {
  document.getElementById("start").addEventListener("click", () => {
    let url = "";
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      url = tabs[0].url;

      let found = false;
      let surveyType = "";
      const surveyTypes = {
        "https://ufuture.uitm.edu.my/sufo/questions/index": "sufo",
        "https://ufuture.uitm.edu.my/kifo/questions/index": "kifo",
        "https://ufuture.uitm.edu.my/ess/answers/entry/": "entrance",
        "https://ufuture.uitm.edu.my/ess/answers/exits/": "exit",
      };

      for (const [key, value] of Object.entries(surveyTypes)) {
        if (url.includes(key)) {
          surveyType = value;
          found = true;
          break;
        }
      }

      // document.addEventListener("DOMContentLoaded", function () {
      if (!found) {
        let button = document.getElementById("start");
        let status = document.getElementById("status");
        let statusMessage = document.getElementById("status-message");
        statusMessage.innerHTML = "Please run the script on the right website.";
        status.classList.remove("alert-primary");
        status.classList.add("alert-danger");
        button.blur();

        // make the background red for 3 seconds
        setTimeout(() => {
          statusMessage.innerHTML = "Try again.";
          status.classList.remove("alert-danger");
          status.classList.add("alert-primary");
        }, 3000);

        return;
      }

      chrome.scripting.executeScript({
        // target is the current tab
        target: { tabId: tabs[0].id },
        function: start(surveyType),
      });
      // });
    });
  });
});

function start(surveyType) {
  // It selects all the radio input elements and clicks them
  // alert("Please wait for the script to finish. Do not click anything.");
  let radios = document.querySelectorAll("input[type='radio']");
  for (let radio of radios) {
    radio.click();
  }

  // This is a function that checks the condition of the radio input elements
  // If the condition is 1-4 (for sufo and kifo), it clicks the last one in the line
  // If the condition is 1-4 (for entrance and exit), it clicks the first one in the line
  function checkCondition() {
    // Get all the parent elements of the radio inputs
    let parents = new Set();
    for (let radio of radios) {
      let parent = radio.parentElement;
      if (parent) {
        parents.add(parent);
      }
    }

    // Loop through each parent element and check the condition
    for (let parent of parents) {
      // Get all the children elements that are radio inputs
      let children = parent.querySelectorAll("input[type='radio']");
      let condition = children.length; // The condition is the number of radio inputs in the line
      if (condition >= 1 && condition <= 4) {
        // Click the last one in the line
        if (surveyType === "entrance" || surveyType === "kifo") {
          children[0].click();
        } else {
          children[children.length - 1].click();
        }
      }
    }
  }

  // Call the function after the page is loaded
  window.addEventListener("load", checkCondition);

  // click the submit button after everything is done
  // the button type is submit
  let submit = document.querySelector("button[type='submit']");
  submit.click();
}
