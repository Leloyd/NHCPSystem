(function () {
  var form = document.getElementById("accountSetupForm");
  var configNode = document.getElementById("accountSetupConfig");
  if (!form || !configNode) {
    return;
  }

  var config = {};
  try {
    config = JSON.parse(configNode.textContent || "{}");
  } catch (_error) {
    config = {};
  }

  var steps = Array.prototype.slice.call(document.querySelectorAll("[data-setup-step]"));
  var stepLabel = document.getElementById("accountSetupStepLabel");
  var stepTitle = document.getElementById("accountSetupStepTitle");
  var stepDescription = document.getElementById("accountSetupStepDescription");
  var progressBar = document.getElementById("accountSetupProgressBar");
  var progressText = document.getElementById("accountSetupProgressText");
  var nextButton = document.getElementById("accountSetupNextButton");
  var prevButton = document.getElementById("accountSetupPrevButton");
  var prevButtonMobile = document.getElementById("accountSetupPrevButtonMobile");
  var clientError = document.getElementById("accountSetupClientError");
  var serverError = document.getElementById("accountSetupServerError");

  var fullNameInput = document.getElementById("setupFullName");
  var usernameInput = document.getElementById("setupUsername");
  var countrySelect = document.getElementById("setupCountrySelect");
  var provinceSelect = document.getElementById("setupProvinceSelect");
  var citySelect = document.getElementById("setupCitySelect");
  var provinceSelectWrap = document.getElementById("setupProvinceSelectWrap");
  var citySelectWrap = document.getElementById("setupCitySelectWrap");
  var provinceManualWrap = document.getElementById("setupProvinceManualWrap");
  var cityManualWrap = document.getElementById("setupCityManualWrap");
  var provinceManualInput = document.getElementById("setupProvinceManual");
  var cityManualInput = document.getElementById("setupCityManual");
  var locationHelper = document.getElementById("setupLocationHelper");
  var hiddenCountryInput = document.getElementById("setupCountryHidden");
  var hiddenProvinceInput = document.getElementById("setupProvinceHidden");
  var hiddenCityInput = document.getElementById("setupCityHidden");

  var currentStep = 0;
  var provinces = [];
  var cities = [];
  var countries = [];

  function showClientError(message) {
    if (!clientError) {
      return;
    }
    clientError.textContent = message || "";
    clientError.classList.toggle("hidden", !message);
  }

  function clearErrors() {
    showClientError("");
    if (serverError) {
      serverError.classList.add("hidden");
    }
  }

  function getSelectedUseCase() {
    var checked = form.querySelector('input[name="website_use_case"]:checked');
    return checked ? String(checked.value || "").trim() : "";
  }

  function getSelectedRoles() {
    return Array.prototype.slice
      .call(form.querySelectorAll('input[name="profile_roles"]:checked'))
      .map(function (input) {
        return String(input.value || "").trim();
      })
      .filter(Boolean);
  }

  function updateProgressUi() {
    var total = steps.length;
    var percent = Math.round(((currentStep + 1) / total) * 100);
    if (stepLabel) {
      stepLabel.textContent = "Step " + (currentStep + 1) + " of " + total;
    }
    if (progressText) {
      progressText.textContent = percent + "%";
    }
    if (progressBar) {
      progressBar.style.width = percent + "%";
    }
    var activeStep = steps[currentStep];
    if (activeStep) {
      if (stepTitle) {
        stepTitle.textContent = activeStep.getAttribute("data-step-title") || "";
      }
      if (stepDescription) {
        stepDescription.textContent = activeStep.getAttribute("data-step-description") || "";
      }
    }
    if (nextButton) {
      nextButton.textContent = currentStep === steps.length - 1 ? "Finish Setup" : "Next";
    }
    var showPrev = currentStep > 0;
    [prevButton, prevButtonMobile].forEach(function (button) {
      if (!button) {
        return;
      }
      button.classList.toggle("hidden", !showPrev);
      button.classList.toggle("inline-flex", showPrev);
    });
  }

  function showStep(index) {
    currentStep = index;
    steps.forEach(function (stepNode, stepIndex) {
      stepNode.classList.toggle("hidden", stepIndex !== index);
    });
    updateProgressUi();
    clearErrors();
  }

  function sortNames(values) {
    return values.slice().sort(function (left, right) {
      return left.localeCompare(right);
    });
  }

  function resetSelect(selectNode, placeholder) {
    if (!selectNode) {
      return;
    }
    selectNode.innerHTML = "";
    var placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    selectNode.appendChild(placeholderOption);
  }

  function appendOptions(selectNode, values, selectedValue) {
    values.forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = value === selectedValue;
      selectNode.appendChild(option);
    });
  }

  function getIsPhilippines() {
    return String(countrySelect ? countrySelect.value || "" : "").trim() === "Philippines";
  }

  function syncHiddenLocationValues() {
    var countryValue = String(countrySelect ? countrySelect.value || "" : "").trim();
    var provinceValue = "";
    var cityValue = "";

    if (getIsPhilippines()) {
      provinceValue = String(provinceSelect ? provinceSelect.value || "" : "").trim();
      cityValue = String(citySelect ? citySelect.value || "" : "").trim();
    } else {
      provinceValue = String(provinceManualInput ? provinceManualInput.value || "" : "").trim();
      cityValue = String(cityManualInput ? cityManualInput.value || "" : "").trim();
    }

    if (hiddenCountryInput) {
      hiddenCountryInput.value = countryValue;
    }
    if (hiddenProvinceInput) {
      hiddenProvinceInput.value = provinceValue;
    }
    if (hiddenCityInput) {
      hiddenCityInput.value = cityValue;
    }

    return {
      country: countryValue,
      province: provinceValue,
      city: cityValue
    };
  }

  function updateLocationMode() {
    var isPhilippines = getIsPhilippines();
    if (provinceSelectWrap) {
      provinceSelectWrap.classList.toggle("hidden", !isPhilippines);
    }
    if (citySelectWrap) {
      citySelectWrap.classList.toggle("hidden", !isPhilippines);
    }
    if (provinceManualWrap) {
      provinceManualWrap.classList.toggle("hidden", isPhilippines);
    }
    if (cityManualWrap) {
      cityManualWrap.classList.toggle("hidden", isPhilippines);
    }
    if (provinceSelect) {
      provinceSelect.disabled = !isPhilippines;
    }
    if (citySelect) {
      citySelect.disabled = !isPhilippines;
    }
    if (provinceManualInput) {
      provinceManualInput.disabled = isPhilippines;
    }
    if (cityManualInput) {
      cityManualInput.disabled = isPhilippines;
    }
    if (locationHelper) {
      locationHelper.textContent = isPhilippines
        ? "Philippine province and city choices are loaded from your local dataset."
        : "For countries outside the Philippines, type your province/state and city manually.";
    }
  }

  function renderProvinceOptions(selectedProvince) {
    resetSelect(provinceSelect, "Select province");
    resetSelect(citySelect, "Select city");
    if (!provinceSelect || !citySelect) {
      return;
    }
    if (!getIsPhilippines()) {
      provinceSelect.disabled = true;
      citySelect.disabled = true;
      return;
    }
    provinceSelect.disabled = false;
    citySelect.disabled = true;
    appendOptions(
      provinceSelect,
      sortNames(
        provinces.map(function (province) {
          return String(province.province_name || "").trim();
        }).filter(Boolean)
      ),
      selectedProvince
    );
  }

  function renderCityOptions(selectedCity) {
    resetSelect(citySelect, "Select city");
    if (!citySelect) {
      return;
    }
    if (!getIsPhilippines()) {
      citySelect.disabled = true;
      return;
    }
    var provinceName = String(provinceSelect ? provinceSelect.value || "" : "").trim();
    var selectedProvinceRecord = provinces.find(function (province) {
      return String(province.province_name || "").trim() === provinceName;
    });
    if (!selectedProvinceRecord) {
      citySelect.disabled = true;
      return;
    }
    var filteredCities = cities
      .filter(function (city) {
        return String(city.province_code || "").trim() === String(selectedProvinceRecord.province_code || "").trim();
      })
      .map(function (city) {
        return String(city.city_name || "").trim();
      })
      .filter(Boolean);
    citySelect.disabled = false;
    appendOptions(citySelect, sortNames(filteredCities), selectedCity);
  }

  function renderCountryOptions(selectedCountry) {
    resetSelect(countrySelect, "Select country");
    if (!countrySelect) {
      return;
    }
    var uniqueCountries = [];
    countries.forEach(function (country) {
      var value = String(country || "").trim();
      if (value && uniqueCountries.indexOf(value) === -1) {
        uniqueCountries.push(value);
      }
    });
    uniqueCountries = sortNames(uniqueCountries);
    if (uniqueCountries.indexOf("Philippines") !== -1) {
      uniqueCountries = ["Philippines"].concat(
        uniqueCountries.filter(function (country) {
          return country !== "Philippines";
        })
      );
    }
    appendOptions(countrySelect, uniqueCountries, selectedCountry);
  }

  function validateStep(index) {
    if (index === 0) {
      var fullName = String(fullNameInput ? fullNameInput.value || "" : "").trim();
      if (fullName.length < 3 || fullName.length > 160) {
        showClientError("Please enter your full name.");
        if (fullNameInput) {
          fullNameInput.focus();
        }
        return false;
      }
      var username = String(usernameInput ? usernameInput.value || "" : "").trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
        showClientError("Choose a username with 3 to 32 lowercase letters, numbers, periods, underscores, or hyphens.");
        if (usernameInput) {
          usernameInput.focus();
        }
        return false;
      }
      if (usernameInput) {
        usernameInput.value = username;
      }
      return true;
    }

    if (index === 1) {
      if (!getSelectedUseCase()) {
        showClientError("Please choose how you plan to use the website.");
        return false;
      }
      return true;
    }

    if (index === 2) {
      if (!getSelectedRoles().length) {
        showClientError("Please select at least one role.");
        return false;
      }
      return true;
    }

    if (index === 3) {
      var locationValues = syncHiddenLocationValues();
      if (!locationValues.country) {
        showClientError("Please select your country.");
        if (countrySelect) {
          countrySelect.focus();
        }
        return false;
      }
      if (!locationValues.province) {
        showClientError("Please select or enter your province.");
        if (getIsPhilippines()) {
          provinceSelect.focus();
        } else if (provinceManualInput) {
          provinceManualInput.focus();
        }
        return false;
      }
      if (!locationValues.city) {
        showClientError("Please select or enter your city.");
        if (getIsPhilippines()) {
          citySelect.focus();
        } else if (cityManualInput) {
          cityManualInput.focus();
        }
        return false;
      }
      return true;
    }

    return true;
  }

  function goToNextStep() {
    clearErrors();
    if (!validateStep(currentStep)) {
      return;
    }
    if (currentStep === steps.length - 1) {
      form.submit();
      return;
    }
    showStep(currentStep + 1);
  }

  function goToPreviousStep() {
    clearErrors();
    if (currentStep > 0) {
      showStep(currentStep - 1);
    }
  }

  function getInitialStep() {
    var configuredStep = Number(config.stepIndex);
    if (!Number.isNaN(configuredStep) && configuredStep >= 0 && configuredStep < steps.length) {
      return configuredStep;
    }
    return 0;
  }

  function bindEvents() {
    if (nextButton) {
      nextButton.addEventListener("click", goToNextStep);
    }
    [prevButton, prevButtonMobile].forEach(function (button) {
      if (!button) {
        return;
      }
      button.addEventListener("click", goToPreviousStep);
    });
    form.addEventListener("submit", function (event) {
      if (!validateStep(steps.length - 1)) {
        event.preventDefault();
      }
    });
    form.addEventListener("input", clearErrors);
    form.addEventListener("change", clearErrors);
    form.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && currentStep < steps.length - 1) {
        var target = event.target;
        if (target && target.tagName !== "TEXTAREA") {
          event.preventDefault();
          goToNextStep();
        }
      }
    });
    if (countrySelect) {
      countrySelect.addEventListener("change", function () {
        updateLocationMode();
        if (getIsPhilippines()) {
          if (provinceManualInput) {
            provinceManualInput.value = "";
          }
          if (cityManualInput) {
            cityManualInput.value = "";
          }
          renderProvinceOptions(String(hiddenProvinceInput ? hiddenProvinceInput.value || "" : "").trim());
          renderCityOptions(String(hiddenCityInput ? hiddenCityInput.value || "" : "").trim());
        } else {
          if (provinceSelect) {
            provinceSelect.value = "";
          }
          if (citySelect) {
            citySelect.value = "";
          }
        }
        syncHiddenLocationValues();
      });
    }
    if (provinceSelect) {
      provinceSelect.addEventListener("change", function () {
        renderCityOptions("");
        syncHiddenLocationValues();
      });
    }
    if (citySelect) {
      citySelect.addEventListener("change", syncHiddenLocationValues);
    }
    if (provinceManualInput) {
      provinceManualInput.addEventListener("input", syncHiddenLocationValues);
    }
    if (cityManualInput) {
      cityManualInput.addEventListener("input", syncHiddenLocationValues);
    }
  }

  Promise.all([
    fetch(String(config.countryJsonUrl || ""), { headers: { Accept: "application/json" } }).then(function (response) {
      return response.json();
    }),
    fetch(String(config.provinceJsonUrl || ""), { headers: { Accept: "application/json" } }).then(function (response) {
      return response.json();
    }),
    fetch(String(config.cityJsonUrl || ""), { headers: { Accept: "application/json" } }).then(function (response) {
      return response.json();
    })
  ])
    .then(function (result) {
      countries = Array.isArray(result[0]) ? result[0] : [];
      provinces = Array.isArray(result[1]) ? result[1] : [];
      cities = Array.isArray(result[2]) ? result[2] : [];

      renderCountryOptions(String(config.selectedCountry || hiddenCountryInput.value || "Philippines").trim() || "Philippines");
      updateLocationMode();
      renderProvinceOptions(String(config.selectedProvince || hiddenProvinceInput.value || "").trim());
      if (getIsPhilippines()) {
        renderCityOptions(String(config.selectedCity || hiddenCityInput.value || "").trim());
      }
      syncHiddenLocationValues();
      bindEvents();
      showStep(getInitialStep());
    })
    .catch(function () {
      countries = ["Philippines"];
      renderCountryOptions(String(config.selectedCountry || hiddenCountryInput.value || "Philippines").trim() || "Philippines");
      updateLocationMode();
      bindEvents();
      showStep(getInitialStep());
      showClientError("We could not load the location choices right now. You can refresh the page and try again.");
    });
})();
