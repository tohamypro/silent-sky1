import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { LineChart, Target, Hash, DollarSign, RefreshCw, Sun, Moon, ChevronsUpDown, HelpCircle, X } from 'lucide-react';

// Helper to format numbers for display
const formatNumForDisplay = (value, decimals = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "0";
    return num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
};

// --- AdSense Component ---
// This component is specifically for displaying a Google AdSense ad unit.
const AdSenseUnit = ({ theme }) => {
  useEffect(() => {
    try {
      // This push is what tells AdSense to load an ad into the designated space.
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <div className="h-full min-h-[600px] w-full flex items-center justify-center p-4">
       <ins className="adsbygoogle"
         style={{ display: 'block', width: '160px', height: '600px' }}
         data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // <-- PASTE YOUR PUBLISHER ID HERE
         data-ad-slot="1234567890" // <-- PASTE YOUR AD SLOT ID HERE
       ></ins>
    </div>
  );
};


// Main App Component
const App = () => {
    // --- State Management ---
    const [theme, setTheme] = useState('dark'); // Default to dark mode
    const [financialsScale, setFinancialsScale] = useState('millions'); // 'thousands', 'millions', 'billions'
    const [sharesScale, setSharesScale] = useState('billions'); // 'millions', 'billions'

    // State now holds strings to accommodate empty values for editing
    const initialFinancials = {
        revenue: { years: ['0', '0', '0', '0', '0'], growths: ['0', '0', '0', '0'] },
        netIncome: { years: ['0', '0', '0', '0', '0'], growths: ['0', '0', '0', '0'] },
        freeCashFlow: { years: ['0', '0', '0', '0', '0'], growths: ['0', '0', '0', '0'] },
    };

    const [financials, setFinancials] = useState(initialFinancials);
    const [inputs, setInputs] = useState({
        multipleValue: '0',
        multipleType: 'P/E',
        sharesOutstanding: '0',
        currentPrice: '0',
    });
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    // --- Theme Control & Style Injection ---
    useEffect(() => {
        const fontLink = document.createElement('link');
        fontLink.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap";
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        const styleId = 'stock-app-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            body { font-family: 'IBM Plex Mono', monospace; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
            input[type=number]::-webkit-inner-spin-button, 
            input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            input[type=number] { -moz-appearance: textfield; }
        `;
        document.head.appendChild(style);
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
    }, [theme]);


    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };
    
    // --- Derived State & Memos ---
    const financialMetrics = useMemo(() => [
        { key: 'revenue', label: 'Revenue' },
        { key: 'netIncome', label: 'Net Income' },
        { key: 'freeCashFlow', label: 'Free Cash Flow' },
    ], []);
    
    // --- Handlers ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setInputs(prev => ({ ...prev, [name]: value }));
        setResults(null);
    };

    const handleFinancialsScaleChange = (e) => {
        setFinancialsScale(e.target.value);
        setResults(null);
    }
    
    const handleSharesScaleChange = (e) => {
        setSharesScale(e.target.value);
        setResults(null);
    }

    const resetFinancials = useCallback(() => {
        setFinancials(initialFinancials);
         setInputs({
            multipleValue: '0',
            multipleType: 'P/E',
            sharesOutstanding: '0',
            currentPrice: '0',
        });
        setResults(null);
    }, [initialFinancials]);
    
    const handleFinancialChange = useCallback((metricKey, type, index, value) => {
        setFinancials(prev => {
            const newFinancials = JSON.parse(JSON.stringify(prev));
            const metric = newFinancials[metricKey];

            const stateKey = type === 'year' ? 'years' : 'growths';
            metric[stateKey][index] = value;

            if (type === 'year') {
                if (index > 0) {
                    const prevYear = parseFloat(metric.years[index - 1]) || 0;
                    const currentYear = parseFloat(metric.years[index]) || 0;
                    metric.growths[index - 1] = prevYear === 0 ? '0' : (((currentYear / prevYear) - 1) * 100).toString();
                }
            }
            
            for (let i = 0; i < 4; i++) {
                const yearVal = parseFloat(metric.years[i]) || 0;
                const growthVal = parseFloat(metric.growths[i]) || 0;
                metric.years[i + 1] = (yearVal * (1 + growthVal / 100)).toString();
            }

            return newFinancials;
        });
        setResults(null);
    }, []);
    
     const handleInputFocus = (e) => {
        if (e.target.value === '0') {
           handleInputChange({target: {name: e.target.name, value: ''}});
        }
    };

    const handleInputBlur = (e) => {
        if (e.target.value === '') {
            handleInputChange({target: {name: e.target.name, value: '0'}});
        }
    };


    const handleCalculation = () => {
        const metricKey = inputs.multipleType === 'P/E' ? 'netIncome' : inputs.multipleType === 'P/S' ? 'revenue' : 'freeCashFlow';
        const finalYearInSelectedScale = parseFloat(financials[metricKey].years[4]) || 0;
        
        const { multipleValue, sharesOutstanding, currentPrice } = inputs;
        if ([multipleValue, sharesOutstanding].some(v => v === '' || isNaN(parseFloat(v)))) {
            setError('Please enter valid numbers for Multiple Value and Shares Outstanding.');
            return;
        }
        setError('');

        let finMultiplier = 1;
        if (financialsScale === 'thousands') finMultiplier = 1 / 1000;
        if (financialsScale === 'billions') finMultiplier = 1000;
        const finalYearInMillions = finalYearInSelectedScale * finMultiplier;

        let sharesMultiplier = 1;
        if (sharesScale === 'billions') sharesMultiplier = 1000;
        const sharesInMillions = parseFloat(sharesOutstanding) * sharesMultiplier;


        const futureCompanyValueInMillions = finalYearInMillions * parseFloat(multipleValue);
        
        const futureSharePrice = sharesInMillions > 0 ? futureCompanyValueInMillions / sharesInMillions : 0;
        
        let upsidePercentage = null;
        const currentPriceNum = parseFloat(currentPrice);
        if (!isNaN(currentPriceNum) && currentPriceNum > 0) {
            upsidePercentage = ((futureSharePrice - currentPriceNum) / currentPriceNum) * 100;
        }

        setResults({
            futureMetricValue: finalYearInMillions,
            futureCompanyValue: futureCompanyValueInMillions,
            futureSharePrice,
            upsidePercentage,
        });
    };
    
    const lightModeClasses = "bg-gray-100 text-gray-800";
    const darkModeClasses = "bg-[#101010] text-gray-200";

    return (
        <div className={`min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300 ${theme === 'light' ? lightModeClasses : darkModeClasses}`}>
            <div className="max-w-7xl mx-auto">
                <header className="relative text-center mb-8">
                    <div className="absolute top-0 right-0">
                         <button onClick={toggleTheme} className="p-2 rounded-sm border border-transparent dark:hover:border-amber-500/50 text-gray-500 dark:text-gray-400 hover:text-amber-400 transition-colors">
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                    </div>
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <LineChart className="text-amber-400" size={36} />
                        <h1 className={`text-3xl sm:text-4xl font-semibold tracking-wider ${theme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>
                            Valuation Terminal
                        </h1>
                    </div>
                    <p className={`text-md ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'}`}>
                        Dynamic Projection & Analysis Matrix
                    </p>
                </header>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <main className={theme === 'light' ? 'bg-white p-6 sm:p-8 border' : 'bg-black/30 p-6 sm:p-8 border border-gray-800'}>
                            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                                <h2 className={`text-xl font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-amber-400'}`}>Financial Projections</h2>
                                <div className="flex items-center gap-4">
                                     <div className="relative">
                                        <select 
                                            value={financialsScale} 
                                            onChange={handleFinancialsScaleChange} 
                                            className="terminal-select"
                                        >
                                            <option value="thousands">Thousands</option>
                                            <option value="millions">Millions</option>
                                            <option value="billions">Billions</option>
                                        </select>
                                        <ChevronsUpDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"/>
                                    </div>
                                    <button onClick={resetFinancials} className={`flex items-center gap-2 text-sm transition-colors ${theme === 'light' ? 'text-gray-600 hover:text-blue-600' : 'text-gray-500 hover:text-amber-400'}`}>
                                        <RefreshCw size={14} /> Reset
                                    </button>
                                </div>
                            </div>
                            <p className={`text-xs mb-4 ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>(All financial values are in {financialsScale})</p>

                            <FinancialProjectionTable financials={financials} metrics={financialMetrics} onChange={handleFinancialChange} />

                            <h2 className={`text-xl font-semibold mt-8 pt-6 ${theme === 'light' ? 'text-gray-900 border-t' : 'text-amber-400 border-t border-gray-800'}`}>Valuation Parameters</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4 items-end">
                                <InputField label="Exit Multiple" name="multipleValue" value={inputs.multipleValue} onChange={handleInputChange} onFocus={handleInputFocus} onBlur={handleInputBlur} />
                                 <div>
                                    <label className={`text-xs font-semibold mb-1 block tracking-wider ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Metric</label>
                                    <select name="multipleType" value={inputs.multipleType} onChange={handleInputChange} className="terminal-select w-full">
                                        <option value="P/E">P/E</option><option value="P/S">P/S</option><option value="P/FCF">P/FCF</option>
                                    </select>
                                </div>
                                
                                <div className="md:col-span-2 grid grid-cols-2 gap-2 items-end">
                                     <InputField label="Shares Outstanding" name="sharesOutstanding" value={inputs.sharesOutstanding} onChange={handleInputChange} onFocus={handleInputFocus} onBlur={handleInputBlur} />
                                     <div className="relative">
                                        <select 
                                            value={sharesScale} 
                                            onChange={handleSharesScaleChange} 
                                            className="terminal-select w-full"
                                        >
                                            <option value="millions">Millions</option>
                                            <option value="billions">Billions</option>
                                        </select>
                                        <ChevronsUpDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"/>
                                   </div>
                                </div>

                                <InputField label="Current Price ($)" name="currentPrice" value={inputs.currentPrice} onChange={handleInputChange} placeholder="Optional" onFocus={handleInputFocus} onBlur={handleInputBlur} />
                            </div>

                            <div className="mt-8 text-center">
                                <button onClick={handleCalculation} className={`w-full sm:w-auto font-semibold py-3 px-12 transition-all ${theme === 'light' ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300' : 'bg-amber-500 text-black hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/50 shadow-[0_0_15px_rgba(255,153,0,0.4)]'}`}>
                                    Calculate Valuation
                                </button>
                                {error && <p className="text-red-500 mt-4 font-medium">{error}</p>}
                            </div>
                        </main>
                        {results && <ResultsDisplay results={results} inputs={inputs} theme={theme} />}
                    </div>

                    <aside className="lg:col-span-1">
                        <AdSenseUnit theme={theme} />
                    </aside>
                </div>

                <div className={`mt-12 p-6 sm:p-8 border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-black/20 border-gray-800'}`}>
                    <h3 className={`text-xl font-semibold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-amber-400'}`}>About This Tool</h3>
                    
                    <div className="space-y-6 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">What Is This?</h4>
                            <p>The Valuation Terminal is a free, interactive calculator designed to help investors project a company's future value. By inputting your own assumptions for growth and valuation multiples, you can quickly estimate a future share price and potential upside.</p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">How It Works</h4>
                            <ol className="list-decimal list-inside space-y-1">
                                <li><span className="font-semibold">Project Financials:</span> Input a company's current revenue, net income, and free cash flow, then adjust the year-by-year growth rates to match your expectations.</li>
                                <li><span className="font-semibold">Set Your Assumptions:</span> Choose your valuation metric (P/E, P/S, or P/FCF), the multiple you expect the company to trade at in five years, and the number of shares outstanding.</li>
                                <li><span className="font-semibold">Calculate Valuation:</span> Instantly see the 5-year projected share price and other key results based on your inputs.</li>
                                <li><span className="font-semibold">Tip:</span> You only need to fill out the financial row that corresponds to the valuation metric you plan to use.</li>
                            </ol>
                        </div>
                        
                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Understanding the Valuation Metrics</h4>
                             <ul className="space-y-2">
                                <li><strong className="text-gray-700 dark:text-gray-200">Price-to-Earnings (P/E):</strong> This ratio values a company based on its net income relative to its share price. It's a common metric for established, profitable businesses.</li>
                                <li><strong className="text-gray-700 dark:text-gray-200">Price-to-Sales (P/S):</strong> This compares a company's stock price to its revenues. It is especially useful for valuing growth companies that may not be profitable yet.</li>
                                <li><strong className="text-gray-700 dark:text-gray-200">Price-to-Free Cash Flow (P/FCF):</strong> This measures the value of a company's stock relative to the actual cash it generates. It is often used for companies with high capital expenditures, as it can provide a clearer picture of financial health than earnings alone.</li>
                            </ul>
                        </div>
                    </div>
                </div>

            </div>
            <footer className={`text-center mt-12 text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                <p>Disclaimer: For educational purposes only. Not financial advice.</p>
            </footer>
        </div>
    );
};

// --- Sub-components ---

const FinancialProjectionTable = ({ financials, metrics, onChange, theme }) => (
    <div className="overflow-x-auto">
        <div className="min-w-[700px]">
            <div className={`grid grid-cols-11 gap-2 text-center text-xs font-medium mb-2 tracking-wider ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'}`}>
                <div className="col-span-2 text-left pl-2">Metric</div>
                <div>Year 1</div><div>Growth</div><div>Year 2</div><div>Growth</div>
                <div>Year 3</div><div>Growth</div><div>Year 4</div><div>Growth</div><div>Year 5</div>
            </div>
            {metrics.map(metric => (
                <FinancialRow key={metric.key} metricKey={metric.key} label={metric.label} data={financials[metric.key]} onChange={onChange} />
            ))}
        </div>
    </div>
);

const FinancialRow = React.memo(({ metricKey, label, data, onChange }) => {
    const onFocus = (type, index) => (e) => {
        if (e.target.value === '0') {
            onChange(metricKey, type, index, '');
        }
    };

    const onBlur = (type, index) => (e) => {
        if (e.target.value === '') {
            onChange(metricKey, type, index, '0');
        }
    };
    
    return (
        <div className="grid grid-cols-11 gap-2 items-center mb-2">
            <div className="col-span-2 text-left font-medium text-gray-800 dark:text-gray-300 pl-2">{label}</div>
            {data.years.map((year, i) => (
                <React.Fragment key={i}>
                    <input
                        type="number"
                        name={`${metricKey}-year-${i}`}
                        value={year} 
                        onChange={(e) => onChange(metricKey, 'year', i, e.target.value)}
                        onFocus={onFocus('year', i)}
                        onBlur={onBlur('year', i)}
                        className="terminal-input"
                        aria-label={`${label} Year ${i + 1}`}
                        step="any"
                    />
                    {i < 4 && (
                        <div className="relative">
                            <input
                                type="number"
                                name={`${metricKey}-growth-${i}`}
                                value={data.growths[i]}
                                onChange={(e) => onChange(metricKey, 'growth', i, e.target.value)}
                                onFocus={onFocus('growth', i)}
                                onBlur={onBlur('growth', i)}
                                className="terminal-input bg-gray-200 dark:bg-gray-900/50"
                                aria-label={`${label} Growth Year ${i + 1} to ${i + 2}`}
                                step="any"
                            />
                             <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-500 text-sm">%</span>
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
});


const InputField = ({ label, name, value, onChange, placeholder = '', onFocus, onBlur }) => (
    <div>
        <label htmlFor={name} className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block tracking-wider">{label}</label>
        <input id={name} name={name} type="number" value={value} onChange={onChange} onFocus={onFocus} onBlur={onBlur} placeholder={placeholder} className="terminal-input w-full" step="any"/>
    </div>
);

const HelpPopup = ({ onClose, content, theme }) => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className={`relative max-w-sm w-full p-6 border ${theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-900 border-gray-700'}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className={`absolute top-2 right-2 p-1 transition-colors ${theme === 'light' ? 'text-gray-500 hover:text-gray-800' : 'text-gray-500 hover:text-gray-100'}`}>
          <X size={20} />
        </button>
        <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{content}</div>
      </div>
    </div>
  );

const ResultsDisplay = ({ results, inputs, theme }) => {
    const { futureMetricValue, futureSharePrice, upsidePercentage } = results;
    const [showMetricHelp, setShowMetricHelp] = useState(false);
    const [showResultsHelp, setShowResultsHelp] = useState(false);
    
    const metricName = useMemo(() => {
        switch (inputs.multipleType) {
            case 'P/E': return 'Net Income';
            case 'P/S': return 'Revenue';
            case 'P/FCF': return 'Free Cash Flow';
            default: return 'Metric';
        }
    }, [inputs.multipleType]);
    
    const lightModeClasses = "bg-white border";
    const darkModeClasses = "bg-black/30 border border-gray-800";
    
    const metricHelpText = `This is the projected value for Year 5 of the metric you selected for valuation (${metricName}). It is the number that will be multiplied by your Exit Multiple to determine the future company value.`;
    const resultsHelpText = (
        <div>
            <p className="font-semibold mb-2">The results are calculated as follows:</p>
            <ol className="list-decimal list-inside space-y-2 text-xs">
                <li><strong className={theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}>Future Company Value</strong> = (Projected Year 5 Metric) × (Exit Multiple)</li>
                <li><strong className={theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}>Future Share Price</strong> = (Future Company Value) / (Shares Outstanding)</li>
                <li><strong className={theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}>Potential Upside</strong> = ((Future Share Price - Current Price) / Current Price) × 100%</li>
            </ol>
        </div>
    );


    return (
        <>
            {showMetricHelp && <HelpPopup onClose={() => setShowMetricHelp(false)} content={metricHelpText} theme={theme} />}
            {showResultsHelp && <HelpPopup onClose={() => setShowResultsHelp(false)} content={resultsHelpText} theme={theme} />}
            <div className={`mt-8 p-6 sm:p-8 animate-fade-in ${theme === 'light' ? lightModeClasses : darkModeClasses}`}>
                 <div className="flex items-center justify-center gap-2 mb-6">
                    <h2 className={`text-2xl font-semibold tracking-wider ${theme === 'light' ? 'text-gray-900' : 'text-amber-400'}`}>Valuation Results</h2>
                    <button onClick={() => setShowResultsHelp(true)} className="text-gray-500 hover:text-amber-400 transition-colors">
                        <HelpCircle size={18}/>
                    </button>
                </div>
                <div className={`space-y-4 border p-4 max-w-md mx-auto ${theme === 'light' ? 'border-gray-200' : 'border-gray-800'}`}>
                    <ResultCard 
                        title={`Projected Year 5 Selected Metric`} 
                        value={`$${formatNumForDisplay(futureMetricValue)} M`} 
                        theme={theme}
                        onHelpClick={() => setShowMetricHelp(true)}
                    />
                    <ResultCard title="Estimated Future Share Price" value={`$${formatNumForDisplay(futureSharePrice)}`} isPrimary theme={theme}/>
                    {upsidePercentage !== null && (
                        <ResultCard title="Potential Upside" value={`${formatNumForDisplay(upsidePercentage)}%`} isPositive={upsidePercentage > 0} theme={theme}/>
                    )}
                </div>
            </div>
        </>
    );
};


const ResultCard = ({ title, value, isPrimary = false, isPositive, theme, onHelpClick }) => {
    let valueColor;
    let borderColor = theme === 'light' ? 'border-gray-200' : 'border-gray-700';

    if (isPrimary) {
        valueColor = theme === 'light' ? 'text-blue-600' : 'text-amber-300';
        borderColor = theme === 'light' ? 'border-blue-500' : 'border-amber-400';
    } else if (isPositive === true) {
        valueColor = 'text-green-500';
    } else if (isPositive === false) {
        valueColor = 'text-red-500';
    } else {
        valueColor = theme === 'light' ? 'text-gray-800' : 'text-cyan-400';
    }

    return (
        <div className={`p-4 border-l-2 ${borderColor}`}>
            <div className="flex items-center gap-2">
                 <h3 className={`text-xs font-medium uppercase tracking-wider ${isPrimary ? (theme === 'light' ? 'text-blue-500' : 'text-amber-400/80') : 'text-gray-500'}`}>{title}</h3>
                 {onHelpClick && (
                    <button onClick={onHelpClick} className="text-gray-500 hover:text-amber-400 transition-colors">
                        <HelpCircle size={14}/>
                    </button>
                 )}
            </div>
            <p className={`text-3xl font-semibold my-1 ${valueColor}`}>{value}</p>
        </div>
    );
};

// Add terminal-specific styles
const style = document.createElement('style');
style.textContent += `
    .terminal-input {
        background-color: transparent;
        border: 1px solid;
        padding: 0.5rem;
        width: 100%;
        transition: border-color 0.2s, box-shadow 0.2s;
    }
    .light .terminal-input { border-color: #D1D5DB; color: #1F2937; }
    .dark .terminal-input { border-color: #4A5568; color: #E2E8F0; }
    
    .light .terminal-input:focus { outline: none; border-color: #3B82F6; box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
    .dark .terminal-input:focus { outline: none; border-color: #FFA500; box-shadow: 0 0 5px rgba(255, 165, 0, 0.5); }

    .terminal-select {
        border: 1px solid;
        padding: 0.5rem;
        padding-right: 2rem;
        appearance: none;
        cursor: pointer;
        transition: border-color 0.2s;
    }
    .light .terminal-select { background-color: #F3F4F6; border-color: #D1D5DB; color: #1F2937; }
    .dark .terminal-select { background-color: #1A202C; border-color: #4A5568; color: #E2E8F0; }
    
    .light .terminal-select:focus { outline: none; border-color: #3B82F6; }
    .dark .terminal-select:focus { outline: none; border-color: #FFA500; }
`;
document.head.append(style);


export default App;
