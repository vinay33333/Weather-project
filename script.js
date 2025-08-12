// Weather Forecast Application 
// Author: Sampath Vinay Ram Vuppala
// API: OpenWeatherMap API for weather data


// ===== API Configuration =====
const API_KEY = 'ef162e8dd46f197be49eacffba4c775e';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// ===== DOM Elements =====
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const currentLocationBtn = document.getElementById('currentLocationBtn');
const clearBtn = document.getElementById('clearBtn');
const tempToggleBtn = document.getElementById('tempToggleBtn');
const currentWeatherSection = document.getElementById('currentWeatherSection');
const forecastSection = document.getElementById('forecastSection');
const recentCitiesDropdown = document.getElementById('recentCitiesDropdown');
const currentLocationName = document.getElementById('currentLocationName');
const currentDateTime = document.getElementById('currentDateTime');
const mainWeatherIcon = document.getElementById('mainWeatherIcon');
const currentTemp = document.getElementById('currentTemp');
const weatherDescription = document.getElementById('weatherDescription');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const visibility = document.getElementById('visibility');
const pressure = document.getElementById('pressure');
const tempAlert = document.getElementById('tempAlert');
const tempAlertIcon = document.getElementById('tempAlertIcon');
const tempAlertText = document.getElementById('tempAlertText');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const successMessage = document.getElementById('successMessage');
const successText = document.getElementById('successText');
const loadingSpinner = document.getElementById('loadingSpinner');
const forecastContainer = document.getElementById('forecastContainer');

// ===== Global State =====
let currentWeatherData = null;
let isCelsius = true;
let recentCities = JSON.parse(localStorage.getItem('weatherAppRecentCities')) || [];
let loadingTimeout;

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', initializeApp);
searchBtn.addEventListener('click', handleCitySearch);
currentLocationBtn.addEventListener('click', handleCurrentLocationSearch);
clearBtn.addEventListener('click', clearAllData);
tempToggleBtn.addEventListener('click', toggleTemperatureUnit);
cityInput.addEventListener('input', handleCityInputChange);
cityInput.addEventListener('keypress', handleCityInputKeypress);
cityInput.addEventListener('focus', handleCityInputFocus);

// Enhanced click outside handler
document.addEventListener('click', (e) => {
    if (!cityInput.contains(e.target) && !recentCitiesDropdown.contains(e.target)) {
        hideRecentCitiesDropdown();
    }
});

// ===== Initialization =====
function initializeApp() {
    showSuccessMessage('WeatherCast Ready! 🌤️');
    // Add demo cities for better presentation
    if (recentCities.length === 0) {
        recentCities = ['London, GB', 'Mumbai, IN', 'New York, US', 'Tokyo, JP', 'Paris, FR'];
        localStorage.setItem('weatherAppRecentCities', JSON.stringify(recentCities));
    }
}

// ===== Enhanced Input Handlers =====
function handleCityInputChange(e) {
    const value = e.target.value.trim();
    
    if (recentCities.length > 0) {
        if (value.length > 0) {
            showRecentCitiesDropdown(value);
        } else {
            showRecentCitiesDropdown();
        }
    }
}

function handleCityInputFocus(e) {
    if (recentCities.length > 0) {
        showRecentCitiesDropdown(e.target.value.trim());
    }
}

function handleCityInputKeypress(e) {
    if (e.key === 'Enter') {
        hideRecentCitiesDropdown();
        handleCitySearch();
    }
    if (e.key === 'Escape') {
        hideRecentCitiesDropdown();
        cityInput.blur();
    }
}

// ===== Search Handlers =====
async function handleCitySearch() {
    const city = cityInput.value.trim();
    if (!city) return showErrorMessage('Please enter a city name');
    if (city.length < 2) return showErrorMessage('City name too short');
    
    hideRecentCitiesDropdown();
    showOptimizedLoading();
    await fetchWeatherByCity(city);
}

async function handleCurrentLocationSearch() {
    if (!navigator.geolocation) {
        return showErrorMessage('Geolocation not supported');
    }
    
    showOptimizedLoading('Getting your location...');
    
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const { latitude, longitude } = pos.coords;
            await fetchWeatherByCoordinates(latitude, longitude);
        },
        (err) => {
            hideLoading();
            const errors = {
                1: 'Location access denied',
                2: 'Location unavailable', 
                3: 'Location request timed out'
            };
            showErrorMessage(errors[err.code] || 'Location error');
        },
        { timeout: 5000, enableHighAccuracy: false }
    );
}

function clearAllData() {
    cityInput.value = '';
    currentWeatherSection.classList.add('hidden');
    forecastSection.classList.add('hidden');
    currentWeatherData = null;
    hideRecentCitiesDropdown();
    changeWeatherBackground('default');
    showSuccessMessage('Cleared successfully');
}

// ===== Optimized API Calls =====
async function fetchWeatherByCity(city) {
    try {
        // Parallel API calls for faster loading
        const [currentRes, forecastRes] = await Promise.all([
            fetch(`${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`),
            fetch(`${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`)
        ]);
        
        if (!currentRes.ok) {
            throw new Error(currentRes.status === 404 ? 'City not found' : 'Weather fetch failed');
        }
        
        const [currentData, forecastData] = await Promise.all([
            currentRes.json(),
            forecastRes.json()
        ]);
        
        hideLoading();
        
        displayCurrentWeather(currentData);
        displayForecast(forecastData);
        addToRecentCities(currentData.name, currentData.sys.country);
        showSuccessMessage(`${currentData.name} weather loaded`);
        
    } catch (err) {
        hideLoading();
        handleWeatherAPIError(err);
    }
}

async function fetchWeatherByCoordinates(lat, lon) {
    try {
        const [currentRes, forecastRes] = await Promise.all([
            fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
            fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
        ]);
        
        const [currentData, forecastData] = await Promise.all([
            currentRes.json(),
            forecastRes.json()
        ]);
        
        hideLoading();
        
        displayCurrentWeather(currentData);
        displayForecast(forecastData);
        addToRecentCities(currentData.name, currentData.sys.country);
        cityInput.value = currentData.name;
        showSuccessMessage(`Location: ${currentData.name}`);
        
    } catch (err) {
        hideLoading();
        handleWeatherAPIError(err);
    }
}

// ===== Display Functions =====
function displayCurrentWeather(data) {
    currentWeatherData = data;
    currentLocationName.textContent = `${data.name}, ${data.sys.country}`;
    currentDateTime.textContent = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const temp = Math.round(data.main.temp);
    currentTemp.textContent = `${temp}°${isCelsius ? 'C' : 'F'}`;
    weatherDescription.textContent = capitalizeWords(data.weather[0].description);
    feelsLike.textContent = `Feels like ${Math.round(data.main.feels_like)}°${isCelsius ? 'C' : 'F'}`;
    
    updateWeatherIcon(data.weather[0].main);
    changeWeatherBackground(data.weather[0].main.toLowerCase());
    
    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
    visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    pressure.textContent = `${data.main.pressure} hPa`;
    
    checkExtremeTemperature(temp);
    currentWeatherSection.classList.remove('hidden');
}

function displayForecast(data) {
    forecastContainer.innerHTML = '';
    processForecastData(data.list).forEach((f, i) => {
        forecastContainer.appendChild(createForecastCard(f, i));
    });
    forecastSection.classList.remove('hidden');
}

function processForecastData(list) {
    const days = {};
    list.forEach(item => {
        const date = new Date(item.dt * 1000).toDateString();
        if (!days[date]) days[date] = item;
    });
    return Object.values(days).slice(0, 5);
}

function createForecastCard(forecast, index) {
    const card = document.createElement('div');
    card.className = 'bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-4 text-center forecast-card border border-white border-opacity-20';
    const date = new Date(forecast.dt * 1000);
    
    card.innerHTML = `
        <div class="text-white font-semibold mb-2">${index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
        <div class="text-white text-opacity-70 text-xs mb-3">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
        <div class="text-4xl mb-3">${getWeatherIcon(forecast.weather[0].main)}</div>
        <div class="text-white text-xl font-bold mb-2">${Math.round(forecast.main.temp)}°C</div>
        <div class="text-white text-opacity-80 text-sm mb-3 capitalize">${forecast.weather[0].description}</div>
        <div class="grid grid-cols-3 gap-2 text-xs">
            <div class="text-white text-opacity-70">
                <i class="fas fa-tint text-blue-300"></i>
                <div>${forecast.main.humidity}%</div>
            </div>
            <div class="text-white text-opacity-70">
                <i class="fas fa-wind text-gray-300"></i>
                <div>${Math.round(forecast.wind.speed * 3.6)} km/h</div>
            </div>
            <div class="text-white text-opacity-70">
                <i class="fas fa-thermometer-half text-red-300"></i>
                <div>${Math.round(forecast.main.feels_like)}°</div>
            </div>
        </div>
    `;
    
    return card;
}

// ===== Weather Helpers =====
function capitalizeWords(str) {
    return str.split(' ').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
}

function updateWeatherIcon(main) {
    mainWeatherIcon.textContent = getWeatherIcon(main);
    mainWeatherIcon.className = 'text-8xl md:text-9xl mb-4 weather-icon-animate';
}

function getWeatherIcon(main) {
    const icons = {
        Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️', 
        Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️', Fog: '🌫️', 
        Haze: '🌫️', Dust: '🌪️', Sand: '🌪️', Ash: '🌋', 
        Squall: '💨', Tornado: '🌪️'
    };
    return icons[main] || '🌤️';
}

function changeWeatherBackground(type) {
    document.body.classList.remove('weather-clear', 'weather-clouds', 'weather-rain', 'weather-snow', 'weather-thunderstorm');
    
    switch(type) {
        case 'clear':
            document.body.classList.add('weather-clear');
            break;
        case 'clouds':
            document.body.classList.add('weather-clouds');
            break;
        case 'rain':
        case 'drizzle':
        case 'thunderstorm':
            document.body.classList.add('weather-rain');
            break;
        case 'snow':
            document.body.classList.add('weather-snow');
            break;
        default:
            // Keep default gradient
            break;
    }
}

function checkExtremeTemperature(temp) {
    tempAlert.classList.add('hidden');
    
    if (temp > 40) {
        tempAlert.className = 'mb-6 p-4 rounded-lg border-l-4 heat-alert';
        tempAlertIcon.className = 'fas fa-thermometer-full text-2xl mr-3';
        tempAlertText.textContent = `Heat Warning! Extremely high temperature: ${temp}°C`;
        tempAlert.classList.remove('hidden');
    } else if (temp < 5) {
        tempAlert.className = 'mb-6 p-4 rounded-lg border-l-4 cold-alert';
        tempAlertIcon.className = 'fas fa-snowflake text-2xl mr-3';
        tempAlertText.textContent = `Cold Warning! Very low temperature: ${temp}°C`;
        tempAlert.classList.remove('hidden');
    }
}

// ===== Temperature Toggle =====
function toggleTemperatureUnit() {
    if (!currentWeatherData) return showErrorMessage('No weather data available');
    
    isCelsius = !isCelsius;
    const temp = currentWeatherData.main.temp;
    const feels = currentWeatherData.main.feels_like;
    
    if (isCelsius) {
        currentTemp.textContent = `${Math.round(temp)}°C`;
        feelsLike.textContent = `Feels like ${Math.round(feels)}°C`;
        showSuccessMessage('Switched to Celsius');
    } else {
        currentTemp.textContent = `${Math.round(temp * 9/5 + 32)}°F`;
        feelsLike.textContent = `Feels like ${Math.round(feels * 9/5 + 32)}°F`;
        showSuccessMessage('Switched to Fahrenheit');
    }
}

// ===== 🔥 CRYSTAL CLEAR Recent Cities Dropdown =====
function addToRecentCities(city, country) {
    const cityLabel = `${city}, ${country}`;
    recentCities = recentCities.filter(c => c !== cityLabel);
    recentCities.unshift(cityLabel);
    recentCities = recentCities.slice(0, 5);
    localStorage.setItem('weatherAppRecentCities', JSON.stringify(recentCities));
}

function showRecentCitiesDropdown(filterText = '') {
    if (recentCities.length === 0) return;
    
    // Clear and rebuild with CRYSTAL CLEAR styling
    recentCitiesDropdown.innerHTML = '';
    recentCitiesDropdown.className = 'absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl z-50 border border-gray-200 overflow-hidden max-h-80 overflow-y-auto crystal-clear-dropdown';
    
    // FORCE remove any blur effects
    recentCitiesDropdown.style.backdropFilter = 'none';
    recentCitiesDropdown.style.webkitBackdropFilter = 'none';
    recentCitiesDropdown.style.background = '#ffffff';
    recentCitiesDropdown.style.opacity = '1';
    
    // Filter cities
    let filteredCities = recentCities;
    if (filterText) {
        filteredCities = recentCities.filter(city => 
            city.toLowerCase().includes(filterText.toLowerCase())
        );
        if (filteredCities.length === 0) filteredCities = recentCities;
    }
    
    // Crystal clear header
    const header = document.createElement('div');
    header.className = 'bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 text-sm font-bold flex items-center';
    header.innerHTML = `
        <i class="fas fa-clock mr-2"></i>
        Recent Searches
        <span class="ml-auto text-xs opacity-90">${filteredCities.length} cities</span>
    `;
    recentCitiesDropdown.appendChild(header);
    
    // Add cities with crystal clear styling
    filteredCities.forEach((city, index) => {
        const cityItem = document.createElement('div');
        cityItem.className = 'px-4 py-3 hover:bg-blue-50 cursor-pointer transition-all duration-200 border-b border-gray-100 group recent-city-item';
        
        const [cityName, countryCode] = city.split(', ');
        
        cityItem.innerHTML = `
            <div class="flex items-center">
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                    <i class="fas fa-map-marker-alt text-blue-600 text-sm"></i>
                </div>
                <div class="flex-1">
                    <div class="font-semibold text-gray-900 text-sm">${cityName}</div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide">${countryCode}</div>
                </div>
                <div class="text-gray-400 group-hover:text-blue-500 transition-colors">
                    <i class="fas fa-arrow-right text-sm"></i>
                </div>
            </div>
        `;
        
        // Enhanced click handler
        cityItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            cityInput.value = cityName;
            hideRecentCitiesDropdown();
            
            // Visual feedback
            cityItem.style.background = '#dbeafe';
            setTimeout(() => {
                showOptimizedLoading();
                fetchWeatherByCity(cityName);
            }, 100);
        });
        
        recentCitiesDropdown.appendChild(cityItem);
    });
    
    // Show immediately (no blur transition)
    recentCitiesDropdown.classList.remove('hidden');
}

function hideRecentCitiesDropdown() {
    recentCitiesDropdown.classList.add('hidden');
}

function clearRecentCities() {
    recentCities = [];
    localStorage.removeItem('weatherAppRecentCities');
    hideRecentCitiesDropdown();
    showSuccessMessage('Recent cities cleared');
}

// ===== Optimized Loading System =====
function showOptimizedLoading(message = 'Loading...') {
    if (loadingTimeout) clearTimeout(loadingTimeout);
    
    const loadingText = loadingSpinner.querySelector('span');
    if (loadingText) loadingText.textContent = message;
    
    loadingSpinner.classList.remove('hidden');
    
    // Auto-hide after 800ms for smooth demo
    loadingTimeout = setTimeout(() => {
        hideLoading();
    }, 800);
}

function hideLoading() {
    if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
    }
    loadingSpinner.classList.add('hidden');
}

// ===== UI Messages =====
function showSuccessMessage(msg) {
    successText.textContent = msg;
    successMessage.classList.remove('hidden');
    setTimeout(() => hideMessage('success'), 2500);
}

function showErrorMessage(msg) {
    errorText.textContent = msg;
    errorMessage.classList.remove('hidden');
    setTimeout(() => hideMessage('error'), 3500);
}

function hideMessage(type) {
    (type === 'error' ? errorMessage : successMessage).classList.add('hidden');
}

function handleWeatherAPIError(err) {
    console.error(err);
    if (err.message === 'City not found') {
        showErrorMessage('City not found. Check spelling and try again.');
    } else {
        showErrorMessage('Weather service unavailable. Please try again later.');
    }
}
