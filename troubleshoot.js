import { generateText } from 'ai';

// Error code database for quick lookups
const ERROR_CODES = {
  // Dishwashers
  'E24': { brand: 'Bosch', appliance: 'Dishwasher', meaning: 'Drainage issue - water not draining properly', causes: ['Clogged drain hose', 'Blocked filter', 'Faulty drain pump', 'Kinked drain hose'], fixes: ['Clean the filter and drain area', 'Check drain hose for kinks or clogs', 'Inspect and clean the drain pump', 'Verify proper drain hose installation'] },
  'E15': { brand: 'Bosch', appliance: 'Dishwasher', meaning: 'Water in base pan - leak detection activated', causes: ['Leaking door seal', 'Loose hose connections', 'Cracked sump', 'Faulty water inlet valve'], fixes: ['Tilt machine back 45° to drain base pan', 'Check door seal for damage', 'Inspect all hose connections', 'Check sump for cracks'] },
  'E22': { brand: 'Bosch', appliance: 'Dishwasher', meaning: 'Filter clogged', causes: ['Food debris in filter', 'Grease buildup', 'Improper filter installation'], fixes: ['Remove and clean all filter components', 'Run hot water rinse cycle', 'Ensure filter is properly seated'] },
  // Washers
  'F21': { brand: 'Whirlpool', appliance: 'Washer', meaning: 'Long drain time - taking too long to pump out water', causes: ['Clogged drain pump', 'Kinked drain hose', 'Blocked coin trap', 'Faulty drain pump motor'], fixes: ['Clean the drain pump filter', 'Check drain hose for obstructions', 'Inspect coin trap', 'Test drain pump motor'] },
  'F02': { brand: 'Whirlpool', appliance: 'Washer', meaning: 'Long drain time', causes: ['Drain pump clog', 'Drain hose issue', 'Pump failure'], fixes: ['Clean drain pump filter', 'Check hose for kinks', 'Replace pump if needed'] },
  'OE': { brand: 'LG', appliance: 'Washer', meaning: 'Drain error - water not pumping out', causes: ['Clogged drain filter', 'Kinked drain hose', 'Faulty drain pump'], fixes: ['Clean the drain pump filter', 'Straighten drain hose', 'Test drain pump'] },
  'UE': { brand: 'LG', appliance: 'Washer', meaning: 'Unbalanced load detected', causes: ['Uneven load distribution', 'Machine not level', 'Shock absorbers worn'], fixes: ['Redistribute clothes evenly', 'Level the machine', 'Check shock absorbers'] },
  // Dryers
  'E64': { brand: 'Electrolux', appliance: 'Dryer', meaning: 'Heating system fault', causes: ['Faulty heating element', 'Blown thermal fuse', 'Control board issue'], fixes: ['Test heating element for continuity', 'Check thermal fuse', 'Inspect control board'] },
  'AF': { brand: 'Samsung', appliance: 'Dryer', meaning: 'Airflow restriction - lint buildup detected', causes: ['Clogged lint filter', 'Blocked vent duct', 'Crushed vent hose'], fixes: ['Clean lint filter thoroughly', 'Clean entire vent duct system', 'Replace crushed vent hose'] },
  // Refrigerators
  'OF': { brand: 'Samsung', appliance: 'Refrigerator', meaning: 'Cooling fan error', causes: ['Faulty fan motor', 'Ice buildup around fan', 'Wiring issue'], fixes: ['Check fan for ice obstruction', 'Test fan motor', 'Inspect wiring connections'] },
  'E5': { brand: 'Samsung', appliance: 'Refrigerator', meaning: 'Evaporator fan error', causes: ['Fan motor failure', 'Ice buildup', 'Control board issue'], fixes: ['Defrost evaporator area', 'Test fan motor', 'Check control board'] },
  // Water Heaters
  'E1': { brand: 'Rheem', appliance: 'Water Heater', meaning: 'Water temperature too high', causes: ['Faulty thermostat', 'Shorted temperature sensor', 'Control board malfunction'], fixes: ['Check thermostat settings', 'Test temperature sensor', 'Reset control board'] },
  'E2': { brand: 'Rheem', appliance: 'Water Heater', meaning: 'Water temperature sensor fault', causes: ['Faulty sensor', 'Loose wiring', 'Corrosion'], fixes: ['Test sensor resistance', 'Check wiring connections', 'Replace sensor if faulty'] },
  // HVAC
  'E1': { brand: 'Carrier', appliance: 'HVAC', meaning: 'Communication error between indoor and outdoor units', causes: ['Wiring issue', 'Control board fault', 'Power supply problem'], fixes: ['Check communication wires', 'Inspect control boards', 'Verify power supply'] },
  'E3': { brand: 'Daikin', appliance: 'HVAC', meaning: 'High pressure protection activated', causes: ['Dirty condenser coils', 'Refrigerant overcharge', 'Condenser fan failure'], fixes: ['Clean condenser coils', 'Check refrigerant levels', 'Test condenser fan'] },
};

// Safety check patterns
const SAFETY_REFUSALS = [
  { pattern: /gas\s*(line|leak|valve|pilot|smell)/i, response: 'SAFETY ALERT: Gas work requires a licensed professional. If you smell gas, evacuate immediately and call your utility company. Do not attempt any gas-related repairs yourself.' },
  { pattern: /(240v|breaker\s*panel|main\s*disconnect|service\s*panel)/i, response: 'SAFETY ALERT: High-voltage electrical work requires a licensed electrician. Working on 240V circuits or breaker panels without proper training is extremely dangerous.' },
  { pattern: /(building\s*code|permit\s*required|meet\s*code|code\s*compliance)/i, response: 'I cannot advise on building codes or permit requirements. Please contact your local building department for code compliance questions.' },
  { pattern: /(load[- ]?bearing|foundation|structural|roof\s*framing)/i, response: 'SAFETY ALERT: Structural work requires a licensed contractor or structural engineer. Do not attempt modifications to load-bearing walls, foundations, or roof framing.' },
];

// System prompt for the AI
const SYSTEM_PROMPT = `You are "FixIt AI" - an experienced field technician assistant with 30+ years of hands-on repair experience. You help independent contractors and handymen troubleshoot appliances on job sites.

PERSONALITY:
- Speak like a seasoned mentor, not a corporate AI
- Be direct and practical - techs are busy
- Use trade terminology appropriately
- Show confidence but acknowledge uncertainty when relevant

RESPONSE FORMAT (ALWAYS follow this structure):
1. **Quick Answer** - One clear sentence with the most likely cause/solution
2. **Details** - 2-3 bullet points with specifics
3. **Parts Needed** - List any parts that might be required (with common part numbers if known)
4. **Safety Note** - Any relevant safety considerations

SAFETY RULES (STRICTLY ENFORCE):
- NEVER provide guidance on gas line work, pilot lights, or gas valve adjustments
- NEVER advise on 240V electrical work, breaker panels, or main disconnects
- NEVER make building code or permit recommendations
- For 120V outlet work: Always remind to turn off breaker and verify with non-contact tester
- For refrigerant work: Always mention EPA 608 certification requirement
- For pre-1980 equipment: Warn about potential asbestos

Keep responses concise and scannable - these will be read on a phone screen at a job site.`;

export default async function handler(req, res) {
  // CORS headers for Wix
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { question, messages } = req.body;

    // Support both simple question format and messages array
    const userQuestion = question || (messages && messages.length > 0 ? messages[messages.length - 1].content || messages[messages.length - 1].parts?.[0]?.text : null);

    if (!userQuestion) {
      return res.status(400).json({ 
        error: 'Missing question. Send { "question": "your question here" }' 
      });
    }

    // Check for safety refusals first
    for (const rule of SAFETY_REFUSALS) {
      if (rule.pattern.test(userQuestion)) {
        return res.status(200).json({
          answer: rule.response,
          isSafetyRefusal: true,
          disclaimer: 'This information is for reference only. Always verify with manufacturer documentation. The user assumes all responsibility for safety and code compliance.'
        });
      }
    }

    // Check for error code matches
    const errorCodeMatch = userQuestion.match(/\b([A-Z]{1,2}\d{1,3}|\d{1,2}[A-Z]{1,2})\b/i);
    let contextHint = '';
    
    if (errorCodeMatch) {
      const code = errorCodeMatch[1].toUpperCase();
      const errorInfo = ERROR_CODES[code];
      if (errorInfo) {
        contextHint = `\n\nKNOWN ERROR CODE INFO: ${code} on ${errorInfo.brand} ${errorInfo.appliance} means "${errorInfo.meaning}". Common causes: ${errorInfo.causes.join(', ')}. Typical fixes: ${errorInfo.fixes.join(', ')}.`;
      }
    }

    // Generate AI response
    const result = await generateText({
      model: 'anthropic/claude-sonnet-4-20250514',
      system: SYSTEM_PROMPT + contextHint,
      prompt: userQuestion,
    });

    // Add standard disclaimer
    const disclaimer = 'This information is for reference only. Always verify with manufacturer documentation. The user assumes all responsibility for safety and code compliance. When in doubt, consult a licensed professional.';

    return res.status(200).json({
      answer: result.text,
      disclaimer,
      errorCodeDetected: errorCodeMatch ? errorCodeMatch[1].toUpperCase() : null,
    });

  } catch (error) {
    console.error('Troubleshoot API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
}
