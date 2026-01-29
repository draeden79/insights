/**
 * Internationalization (i18n) Module
 * Supports en-US and pt-BR locales
 */

const STORAGE_KEY = 'alitar_locale';
const DEFAULT_LOCALE = 'en-US';

let currentLocale = localStorage.getItem(STORAGE_KEY) || DEFAULT_LOCALE;

const translations = {
    'en-US': {
        // Page
        title: 'S&P 500: Crash Radar',
        
        // Chart labels
        currentTimeline: 'S&P 500 Current Timeline',
        historicalTimeline: 'Historical Timeline',
        historicalTimelineCrisis: 'Historical Timeline ({crisis} Crisis)',
        indexLevel: 'S&P 500 Index Level (Scaled)',
        currentMarket: 'S&P 500 Now',
        
        // Annotations
        crash: 'Crash',
        bottom: 'Bottom',
        now: 'Now',
        
        // Info box
        historicalCrash: 'Historical Crash',
        historicalBottom: 'Historical Bottom',
        
        // Crises
        crises: {
            '1929': { name: '1929', description: 'Great Depression' },
            '1962': { name: '1962', description: 'Flash Crash' },
            '1973': { name: '1973', description: 'Oil Crisis / Stagflation' },
            '1980': { name: '1980', description: 'Double-Dip Recession' },
            '1987': { name: '1987', description: 'Black Monday' },
            '2001': { name: '2001', description: 'Dot-com Bubble' },
            '2008': { name: '2008', description: 'Financial Crisis' }
        },
        
        // Story narrative
        story: {
            // Strong correlation (>= 0.7)
            strongCorrelationIntro: 'The current S&P 500 trajectory shows a <strong>{percent}% correlation</strong> with the <strong>{crisisName} - {crisisDescription}</strong> pattern. This strong alignment suggests that, if history repeats itself, the index could be heading toward a similar inflection point.',
            // Moderate correlation (>= 0.4)
            moderateCorrelationIntro: 'The current S&P 500 trajectory shows a <strong>{percent}% correlation</strong> with the <strong>{crisisName} - {crisisDescription}</strong> pattern. While the alignment is moderate, there are notable similarities that warrant attention.',
            // Weak correlation (< 0.4)
            weakCorrelationIntro: 'The current S&P 500 trajectory shows a <strong>{percent}% correlation</strong> with the <strong>{crisisName} - {crisisDescription}</strong> pattern. The alignment is relatively weak, suggesting the current trajectory may diverge from this historical precedent.',
            
            // Crash timing
            crashTimingFuture: 'Based on this pattern alignment, if the trajectory continues, the S&P 500 could face a crash around <span class="highlight-date">{projectedDate}</span>, approximately <span class="highlight-number">{months} months</span> from the current data point ({currentDate}).',
            crashTimingPast: 'According to this pattern alignment, the historical crash equivalent would have already occurred. The current S&P 500 position suggests we may be past the typical crash point in this historical pattern.',
            
            // Historical context
            historicalContext: 'In the <strong>{crisisName}</strong> crisis, the S&P 500 crash occurred in <span class="highlight-date">{crashDate}</span>, marking the beginning of a significant market downturn that eventually reached its bottom {monthsToBottom} months later.',
            
            // Interpretation
            strongInterpretation: 'The strong correlation ({percent}%) indicates that the current S&P 500 behavior closely mirrors the pre-crash phase of the {crisisName} crisis. However, it\'s important to remember that historical patterns are guides, not guarantees—markets are complex systems influenced by countless variables.',
            moderateInterpretation: 'The moderate correlation ({percent}%) suggests some similarity with the {crisisName} pattern, but the S&P 500 may follow a different path. Use this analysis as one data point among many in your decision-making process.',
            weakInterpretation: 'The weak correlation ({percent}%) indicates limited similarity with the {crisisName} pattern. The current S&P 500 trajectory appears to be following a different course than this historical precedent.'
        },
        
        // Tooltip
        tooltipTitle: 'Current: {current} | Historical: {historical}'
    },
    
    'pt-BR': {
        // Page
        title: 'S&P 500: Crash Radar',
        
        // Chart labels
        currentTimeline: 'S&P 500 Linha do Tempo Atual',
        historicalTimeline: 'Linha do Tempo Histórica',
        historicalTimelineCrisis: 'Linha do Tempo Histórica (Crise de {crisis})',
        indexLevel: 'Nível do Índice S&P 500 (Escalado)',
        currentMarket: 'S&P 500 Agora',
        
        // Annotations
        crash: 'Crash',
        bottom: 'Fundo',
        now: 'Agora',
        
        // Info box
        historicalCrash: 'Crash Histórico',
        historicalBottom: 'Fundo Histórico',
        
        // Crises
        crises: {
            '1929': { name: '1929', description: 'Grande Depressão' },
            '1962': { name: '1962', description: 'Flash Crash' },
            '1973': { name: '1973', description: 'Crise do Petróleo / Estagflação' },
            '1980': { name: '1980', description: 'Recessão de Duplo Mergulho' },
            '1987': { name: '1987', description: 'Segunda-feira Negra' },
            '2001': { name: '2001', description: 'Bolha das Pontocom' },
            '2008': { name: '2008', description: 'Crise Financeira' }
        },
        
        // Story narrative
        story: {
            // Strong correlation (>= 0.7)
            strongCorrelationIntro: 'A trajetória atual do S&P 500 apresenta uma <strong>correlação de {percent}%</strong> com o padrão da <strong>{crisisName} - {crisisDescription}</strong>. Esse forte alinhamento sugere que, se a história se repetir, o índice pode estar caminhando para um ponto de inflexão semelhante.',
            // Moderate correlation (>= 0.4)
            moderateCorrelationIntro: 'A trajetória atual do S&P 500 apresenta uma <strong>correlação de {percent}%</strong> com o padrão da <strong>{crisisName} - {crisisDescription}</strong>. Embora o alinhamento seja moderado, existem semelhanças notáveis que merecem atenção.',
            // Weak correlation (< 0.4)
            weakCorrelationIntro: 'A trajetória atual do S&P 500 apresenta uma <strong>correlação de {percent}%</strong> com o padrão da <strong>{crisisName} - {crisisDescription}</strong>. O alinhamento é relativamente fraco, sugerindo que a trajetória atual pode divergir desse precedente histórico.',
            
            // Crash timing
            crashTimingFuture: 'Com base nesse alinhamento de padrões, se a trajetória continuar, o S&P 500 poderá enfrentar um crash por volta de <span class="highlight-date">{projectedDate}</span>, aproximadamente <span class="highlight-number">{months} meses</span> a partir do ponto de dados atual ({currentDate}).',
            crashTimingPast: 'De acordo com esse alinhamento de padrões, o equivalente histórico do crash já teria ocorrido. A posição atual do S&P 500 sugere que podemos estar além do ponto típico de crash nesse padrão histórico.',
            
            // Historical context
            historicalContext: 'Na crise de <strong>{crisisName}</strong>, o crash do S&P 500 ocorreu em <span class="highlight-date">{crashDate}</span>, marcando o início de uma queda significativa que eventualmente atingiu seu fundo {monthsToBottom} meses depois.',
            
            // Interpretation
            strongInterpretation: 'A forte correlação ({percent}%) indica que o comportamento atual do S&P 500 reflete de perto a fase pré-crash da crise de {crisisName}. No entanto, é importante lembrar que padrões históricos são guias, não garantias — mercados são sistemas complexos influenciados por inúmeras variáveis.',
            moderateInterpretation: 'A correlação moderada ({percent}%) sugere alguma semelhança com o padrão de {crisisName}, mas o S&P 500 pode seguir um caminho diferente. Use esta análise como um ponto de dados entre muitos no seu processo de tomada de decisão.',
            weakInterpretation: 'A correlação fraca ({percent}%) indica similaridade limitada com o padrão de {crisisName}. A trajetória atual do S&P 500 parece estar seguindo um curso diferente desse precedente histórico.'
        },
        
        // Tooltip
        tooltipTitle: 'Atual: {current} | Histórico: {historical}'
    }
};

/**
 * Get translation for a key
 * @param {string} key - Translation key (supports dot notation: 'story.strongCorrelationIntro')
 * @param {object} params - Parameters to replace in the string
 * @returns {string} Translated string
 */
function t(key, params = {}) {
    const keys = key.split('.');
    let value = translations[currentLocale];
    
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            // Fallback to en-US
            value = translations['en-US'];
            for (const k2 of keys) {
                if (value && typeof value === 'object' && k2 in value) {
                    value = value[k2];
                } else {
                    return key; // Key not found
                }
            }
            break;
        }
    }
    
    if (typeof value !== 'string') {
        return key;
    }
    
    // Replace parameters
    let result = value;
    for (const [param, val] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${param}\\}`, 'g'), val);
    }
    
    return result;
}

/**
 * Get crisis translation
 * @param {string} crisisId - Crisis ID
 * @returns {object} { name, description }
 */
function getCrisisTranslation(crisisId) {
    const crises = translations[currentLocale]?.crises || translations['en-US'].crises;
    return crises[crisisId] || { name: crisisId, description: '' };
}

/**
 * Format date according to current locale
 * @param {string} dateStr - Date string in YYYY-MM-DD or YYYY-MM format
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    
    // Parse date string
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    
    const date = new Date(Date.UTC(year, month, 1));
    
    return new Intl.DateTimeFormat(currentLocale, {
        year: 'numeric',
        month: 'short'
    }).format(date);
}

/**
 * Format date for chart labels (shorter format)
 * @param {string} dateStr - Date string in YYYY-MM-DD or YYYY-MM format
 * @returns {string} Formatted date for chart
 */
function formatChartDate(dateStr) {
    return formatDate(dateStr);
}

/**
 * Get current locale
 * @returns {string} Current locale
 */
function getLocale() {
    return currentLocale;
}

/**
 * Set locale and persist to localStorage
 * @param {string} locale - Locale to set ('en-US' or 'pt-BR')
 */
function setLocale(locale) {
    if (translations[locale]) {
        currentLocale = locale;
        localStorage.setItem(STORAGE_KEY, locale);
        document.documentElement.lang = locale;
        // Update document title
        document.title = t('title') + ' | Alitar';
    }
}

/**
 * Initialize locale from storage or browser settings
 */
function initLocale() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && translations[stored]) {
        currentLocale = stored;
    } else {
        // Try to detect from browser
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('pt')) {
            currentLocale = 'pt-BR';
        } else {
            currentLocale = 'en-US';
        }
        localStorage.setItem(STORAGE_KEY, currentLocale);
    }
    document.documentElement.lang = currentLocale;
    // Update document title on init
    document.title = t('title') + ' | Alitar';
}

// Initialize on load
initLocale();

// Export for use in other modules
window.i18n = {
    t,
    getCrisisTranslation,
    formatDate,
    formatChartDate,
    getLocale,
    setLocale,
    initLocale
};
