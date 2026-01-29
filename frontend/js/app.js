/**
 * Main Application Logic
 * Bubble Roadmap - Compare current market with historical crises
 * 
 * Two X-axes:
 * - Bottom: Current series dates (with projection to bottom)
 * - Top: Historical crisis dates
 * 
 * Supports i18n (en-US and pt-BR)
 */

let chart = null;
let currentCrisis = '1929';
let availableCrises = [];

// Fixed values
const METRIC = 'price';
const WINDOW_MONTHS = 120;

/**
 * Read crisis from URL query params
 */
function getCrisisFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('crisis');
}

/**
 * Update URL with current crisis (without page reload)
 */
function updateURL() {
    const params = new URLSearchParams(window.location.search);
    params.set('crisis', currentCrisis);
    const newURL = `${window.location.pathname}?${params.toString()}`;
    history.replaceState(null, '', newURL);
}

async function init() {
    console.log('Initializing app...');
    
    // Read crisis from URL query params (if present)
    const urlCrisis = getCrisisFromURL();
    if (urlCrisis) {
        currentCrisis = urlCrisis;
    }
    
    // Update page title
    updatePageTitle();
    
    // Set language selector to current locale
    const langSelector = document.getElementById('language-selector');
    if (langSelector) {
        langSelector.value = i18n.getLocale();
    }
    
    try {
        const data = await fetchCrises();
        availableCrises = data.crises;
        
        // Validate that the crisis from URL exists
        const validCrisis = availableCrises.find(c => c.id === currentCrisis);
        if (!validCrisis && availableCrises.length > 0) {
            currentCrisis = '1929'; // Default fallback
        }
        
        populateCrisisSelector();
    } catch (error) {
        console.error('Error loading crises:', error);
    }
    
    setupEventListeners();
    
    // Update URL with current crisis (ensures URL is always in sync)
    updateURL();
    
    loadChart();
}

function updatePageTitle() {
    const titleEl = document.getElementById('page-title');
    if (titleEl) {
        titleEl.textContent = i18n.t('title');
    }
}

function populateCrisisSelector() {
    const selector = document.getElementById('crisis-selector');
    if (!selector) return;
    
    // Sort crises chronologically by crash date
    const sortedCrises = [...availableCrises].sort((a, b) => {
        return a.crashDate.localeCompare(b.crashDate);
    });
    
    selector.innerHTML = sortedCrises.map(crisis => {
        const translated = i18n.getCrisisTranslation(crisis.id);
        return `<option value="${crisis.id}" ${crisis.id === currentCrisis ? 'selected' : ''}>
            ${translated.name} - ${translated.description}
        </option>`;
    }).join('');
}

function setupEventListeners() {
    const crisisSelector = document.getElementById('crisis-selector');
    if (crisisSelector) {
        crisisSelector.addEventListener('change', (e) => {
            currentCrisis = e.target.value;
            updateURL(); // Update URL with new crisis
            loadChart();
        });
    }
    
    const langSelector = document.getElementById('language-selector');
    if (langSelector) {
        langSelector.addEventListener('change', (e) => {
            i18n.setLocale(e.target.value);
            updatePageTitle();
            populateCrisisSelector();
            loadChart();
        });
    }
    
    // Handle browser back/forward navigation
    window.addEventListener('popstate', () => {
        const urlCrisis = getCrisisFromURL();
        if (urlCrisis && urlCrisis !== currentCrisis) {
            currentCrisis = urlCrisis;
            populateCrisisSelector();
            loadChart();
        }
    });
}

async function loadChart() {
    const container = document.querySelector('.chart-container');
    const canvas = document.getElementById('bubble-chart');
    
    try {
        if (canvas) canvas.style.opacity = '0.3';
        
        console.log('Fetching data for crisis:', currentCrisis);
        
        const data = await fetchBubbleRoadmap({
            metric: METRIC,
            crisis: currentCrisis,
            window: WINDOW_MONTHS
        });
        
        console.log('Data received:', data);
        
        renderChart(data);
        updateInfoBox(data);
        
    } catch (error) {
        console.error('Error loading chart:', error);
        if (container) {
            container.innerHTML = `<div class="error">Error: ${error.message}</div><canvas id="bubble-chart"></canvas>`;
        }
    }
}

/**
 * Format date labels for chart using i18n
 */
function formatChartLabels(labels) {
    return labels.map(label => {
        if (!label) return '';
        // Labels come from backend as "Mon YYYY" format, convert to locale
        const parts = label.split(' ');
        if (parts.length !== 2) return label;
        
        const monthMap = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const month = monthMap[parts[0]];
        const year = parts[1];
        if (month && year) {
            return i18n.formatChartDate(`${year}-${month}-01`);
        }
        return label;
    });
}

/**
 * Render chart with two X-axes:
 * - Bottom axis: Current series dates (filled to the end)
 * - Top axis: Historical crisis dates
 */
function renderChart(data) {
    const canvas = document.getElementById('bubble-chart');
    if (!canvas) {
        console.error('Canvas not found!');
        return;
    }
    
    canvas.style.opacity = '1';
    
    if (chart) {
        chart.destroy();
        chart = null;
    }
    
    const ctx = canvas.getContext('2d');
    const chartData = data.chart;
    
    // Get translated crisis info
    const crisisTranslated = i18n.getCrisisTranslation(data.crisis.id);
    
    // Format labels for current locale
    const currentLabelsFormatted = formatChartLabels(chartData.currentLabels);
    const historicalLabelsFormatted = formatChartLabels(chartData.historicalLabels);
    
    // Datasets
    const datasets = [
        {
            label: i18n.t('currentMarket'),
            data: chartData.currentSeries,
            borderColor: '#00ff99',
            backgroundColor: 'transparent',
            borderWidth: 3,
            tension: 0.1,
            pointRadius: 0,
            spanGaps: false,
            xAxisID: 'xBottom'
        },
        {
            label: `${crisisTranslated.name} - ${crisisTranslated.description}`,
            data: chartData.historicalSeries,
            borderColor: data.crisis.color,
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.1,
            pointRadius: 0,
            spanGaps: true,
            xAxisID: 'xBottom'
        }
    ];
    
    // Annotations for crash, bottom, and current end
    const annotations = {};
    
    // Crash line (label at TOP of chart)
    if (chartData.crashPosition >= 0 && chartData.crashPosition < chartData.totalPositions) {
        const crashDateFormatted = i18n.formatDate(data.crisis.crashDate);
        annotations.crashLine = {
            type: 'line',
            xMin: chartData.crashPosition,
            xMax: chartData.crashPosition,
            borderColor: 'rgba(255, 0, 51, 0.7)',
            borderWidth: 2,
            borderDash: [6, 4],
            label: {
                display: true,
                content: `${i18n.t('crash')} (${crashDateFormatted})`,
                position: 'end',
                backgroundColor: 'rgba(255, 0, 51, 0.9)',
                color: '#0d0d0d',
                font: { 
                    family: 'Share Tech Mono',
                    size: 10,
                    weight: 'bold'
                },
                padding: 4
            }
        };
    }
    
    // Bottom line (label at BOTTOM of chart)
    const bottomDateFormatted = i18n.formatDate(data.crisis.bottomDate);
    annotations.bottomLine = {
        type: 'line',
        xMin: chartData.bottomPosition,
        xMax: chartData.bottomPosition,
        borderColor: 'rgba(0, 255, 153, 0.7)',
        borderWidth: 2,
        borderDash: [6, 4],
        label: {
            display: true,
            content: `${i18n.t('bottom')} (${bottomDateFormatted})`,
            position: 'start',
            backgroundColor: 'rgba(0, 255, 153, 0.9)',
            color: '#0d0d0d',
            font: { 
                family: 'Share Tech Mono',
                size: 10,
                weight: 'bold'
            },
            padding: 4
        }
    };
    
    // Current market end line (label at BOTTOM of chart)
    if (chartData.currentEndPosition >= 0 && chartData.currentEndPosition < chartData.totalPositions) {
        const nowDateFormatted = i18n.formatDate(data.current.lastPeriod);
        annotations.currentEndLine = {
            type: 'line',
            xMin: chartData.currentEndPosition,
            xMax: chartData.currentEndPosition,
            borderColor: 'rgba(0, 255, 153, 0.5)',
            borderWidth: 2,
            borderDash: [3, 3],
            label: {
                display: true,
                content: `${i18n.t('now')} (${nowDateFormatted})`,
                position: 'start',
                backgroundColor: 'rgba(0, 255, 153, 0.9)',
                color: '#0d0d0d',
                font: { 
                    family: 'Share Tech Mono',
                    size: 10,
                    weight: 'bold'
                },
                padding: 4
            }
        };
    }
    
    // Create chart with two X-axes
    chart = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: currentLabelsFormatted, 
            datasets 
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#cccccc',
                        font: {
                            family: 'Share Tech Mono',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    filter: (item) => item.raw !== null,
                    backgroundColor: 'rgba(13, 13, 13, 0.95)',
                    borderColor: 'rgba(0, 255, 153, 0.3)',
                    borderWidth: 1,
                    titleColor: '#00ff99',
                    bodyColor: '#cccccc',
                    callbacks: {
                        title: function(context) {
                            const idx = context[0].dataIndex;
                            const currentLabel = currentLabelsFormatted[idx] || '';
                            const histLabel = historicalLabelsFormatted[idx] || '';
                            return i18n.t('tooltipTitle', { current: currentLabel, historical: histLabel });
                        }
                    }
                },
                annotation: {
                    annotations: annotations
                }
            },
            layout: {
                padding: {
                    bottom: 10,
                    top: 10,
                    left: 10,
                    right: 10
                }
            },
            scales: {
                xBottom: {
                    type: 'category',
                    position: 'bottom',
                    title: { 
                        display: true, 
                        text: i18n.t('currentTimeline'),
                        color: '#00ff99',
                        font: { 
                            family: 'Share Tech Mono',
                            weight: 'bold',
                            size: 12
                        }
                    },
                    ticks: { 
                        maxRotation: 45, 
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 12,
                        color: '#999999',
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        drawOnChartArea: true,
                        color: 'rgba(0, 255, 153, 0.1)'
                    }
                },
                xTop: {
                    type: 'category',
                    position: 'top',
                    labels: historicalLabelsFormatted,
                    title: { 
                        display: true, 
                        text: i18n.t('historicalTimelineCrisis', { crisis: crisisTranslated.name }),
                        color: '#00ff99',
                        font: { 
                            family: 'Share Tech Mono',
                            weight: 'bold',
                            size: 12
                        }
                    },
                    ticks: { 
                        maxRotation: 45, 
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 12,
                        color: '#999999',
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                y: {
                    title: { 
                        display: true, 
                        text: i18n.t('indexLevel'),
                        color: '#00ff99',
                        font: {
                            family: 'Share Tech Mono',
                            weight: 'bold',
                            size: 12
                        }
                    },
                    ticks: {
                        color: '#999999',
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        color: 'rgba(0, 255, 153, 0.1)'
                    }
                }
            }
        }
    });
    
    console.log('Chart rendered successfully');
}

function generateStory(data) {
    const monthsToCrash = data.alignment.monthsToCrash || 0;
    const projectedCrashDate = monthsToCrash > 0 
        ? addMonthsToDate(data.current.lastPeriod, monthsToCrash)
        : null;
    const corrPercent = (data.alignment.correlation * 100).toFixed(1);
    const corr = data.alignment.correlation;
    
    // Get translated crisis info
    const crisisTranslated = i18n.getCrisisTranslation(data.crisis.id);
    
    // Format dates
    const crashDateFormatted = i18n.formatDate(data.crisis.crashDate);
    const currentDateFormatted = i18n.formatDate(data.current.lastPeriod);
    const monthsToBottom = monthsBetween(data.crisis.crashDate, data.crisis.bottomDate);
    
    let story = '';
    
    // Opening paragraph - correlation and pattern recognition
    if (corr >= 0.7) {
        story += `<p class="story-narrative">${i18n.t('story.strongCorrelationIntro', {
            percent: corrPercent,
            crisisName: crisisTranslated.name,
            crisisDescription: crisisTranslated.description
        })}</p>`;
    } else if (corr >= 0.4) {
        story += `<p class="story-narrative">${i18n.t('story.moderateCorrelationIntro', {
            percent: corrPercent,
            crisisName: crisisTranslated.name,
            crisisDescription: crisisTranslated.description
        })}</p>`;
    } else {
        story += `<p class="story-narrative">${i18n.t('story.weakCorrelationIntro', {
            percent: corrPercent,
            crisisName: crisisTranslated.name,
            crisisDescription: crisisTranslated.description
        })}</p>`;
    }
    
    // Main insight - crash timing
    if (monthsToCrash > 0 && projectedCrashDate) {
        story += `<p class="story-narrative">${i18n.t('story.crashTimingFuture', {
            projectedDate: projectedCrashDate,
            months: monthsToCrash,
            currentDate: currentDateFormatted
        })}</p>`;
    } else {
        story += `<p class="story-narrative">${i18n.t('story.crashTimingPast')}</p>`;
    }
    
    // Context paragraph - historical reference
    story += `<p class="story-narrative">${i18n.t('story.historicalContext', {
        crisisName: crisisTranslated.name,
        crashDate: crashDateFormatted,
        monthsToBottom: monthsToBottom
    })}</p>`;
    
    // Interpretation paragraph
    if (corr >= 0.7) {
        story += `<p class="story-narrative">${i18n.t('story.strongInterpretation', {
            percent: corrPercent,
            crisisName: crisisTranslated.name
        })}</p>`;
    } else if (corr >= 0.4) {
        story += `<p class="story-narrative">${i18n.t('story.moderateInterpretation', {
            percent: corrPercent,
            crisisName: crisisTranslated.name
        })}</p>`;
    } else {
        story += `<p class="story-narrative">${i18n.t('story.weakInterpretation', {
            percent: corrPercent,
            crisisName: crisisTranslated.name
        })}</p>`;
    }
    
    return story;
}

function updateInfoBox(data) {
    const analysisDetails = document.getElementById('analysis-details');
    
    if (analysisDetails) {
        const story = generateStory(data);
        const crisisTranslated = i18n.getCrisisTranslation(data.crisis.id);
        
        // Format dates for display
        const crashDateFormatted = i18n.formatDate(data.crisis.crashDate);
        const bottomDateFormatted = i18n.formatDate(data.crisis.bottomDate);
        
        analysisDetails.innerHTML = `
            <div class="info-box__crisis-name" style="color: ${data.crisis.color}">
                ${crisisTranslated.name} - ${crisisTranslated.description}
            </div>
            
            <div class="story-narrative-container">
                ${story}
            </div>
            
            <div class="info-box__dates">
                <div><strong>${i18n.t('historicalCrash')}:</strong> ${crashDateFormatted}</div>
                <div><strong>${i18n.t('historicalBottom')}:</strong> ${bottomDateFormatted}</div>
            </div>
        `;
    }
}

function monthsBetween(date1Str, date2Str) {
    const d1 = new Date(date1Str);
    const d2 = new Date(date2Str);
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

function addMonthsToDate(dateStr, months) {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + months);
    return i18n.formatDate(d.toISOString().slice(0, 10));
}

document.addEventListener('DOMContentLoaded', init);
