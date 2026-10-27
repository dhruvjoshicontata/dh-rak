/* Dhara Rakshak — challenge decks.
 * Multiple-choice cards list the correct option first in `o`; options are shuffled when shown.
 * `h` is an optional hint line, `x` an optional explanation shown after answering.
 * Judged cards (kind: 'judge') are checked by the Game Keeper using `sample`. */
(function (DR) {
  'use strict';

  const DECKS = {
    math: { name: 'Mathematics', color: '#f2bf26', ink: '#3b2a00', glyph: 'π', img: 'assets/deck-math.jpg', tray: true },
    science: { name: 'Science', color: '#3f9e4a', ink: '#fff', icon: 'flask', img: 'assets/deck-science.jpg', tray: true },
    english: { name: 'English', color: '#2878d6', ink: '#fff', icon: 'book', img: 'assets/deck-english.jpg', tray: true },
    hindi: { name: 'Hindi', color: '#9a5bd6', ink: '#fff', glyph: 'अ', img: 'assets/deck-hindi.jpg', tray: true },
    social: { name: 'Social Science', color: '#f0821e', ink: '#fff', icon: 'columns', img: 'assets/deck-social.jpg', tray: true },
    memory: { name: 'Memory', color: '#e2569d', ink: '#fff', icon: 'brain', img: 'assets/deck-memory.jpg', tray: true },
    concentration: { name: 'Concentration', color: '#2a9fd8', ink: '#fff', icon: 'eye', img: 'assets/deck-concentration.jpg', tray: true },
    action: { name: 'Action', color: '#e23c32', ink: '#fff', icon: 'run', img: 'assets/deck-action.jpg', tray: true },
    eco: { name: 'Eco-Mission', color: '#7fae22', ink: '#fff', icon: 'bulb' },
    rishi: { name: 'Rishi Gyaan', color: '#a8692e', ink: '#fff', icon: 'diya' },
    teamwork: { name: 'Teamwork Bridge', color: '#3a4fc0', ink: '#fff', icon: 'people' },
    tapasya: { name: 'Tapasya Trial', color: '#8a3d0e', ink: '#fff', icon: 'flame' },
    mahashakti: { name: 'Mahashakti Challenge', color: '#3d1f6e', ink: '#ffd54f', icon: 'lotus' },
    grand: { name: 'Grand Green Challenge', color: '#1f5c34', ink: '#fff', icon: 'leaf' },
    karma: { name: 'Karma Recovery', color: '#4a1322', ink: '#ffcf9e', icon: 'storm' },
    tiebreak: { name: 'Tie-breaker', color: '#5a3a1a', ink: '#fff', icon: 'emblem' },
  };

  const SUBJECTS = ['math', 'science', 'english', 'hindi', 'social'];

  const math = [
    { q: 'A village uses 120 litres of water daily. It saves 25%. How many litres does it save?', o: ['30 litres', '25 litres', '40 litres', '90 litres'], x: '25% of 120 = 120 ÷ 4 = 30.' },
    { q: 'A school planted 8 rows of saplings with 12 saplings in each row. How many saplings were planted?', o: ['96', '86', '20', '108'] },
    { q: 'A solar panel produces 5 units of electricity a day. How many units does it produce in 30 days?', o: ['150', '35', '120', '180'] },
    { q: 'Out of 200 trees in a park, 50 are neem trees. What percentage are neem trees?', o: ['25%', '50%', '20%', '40%'], x: '50 ÷ 200 = 1/4 = 25%.' },
    { q: 'A family cut its plastic bags from 28 a week to 7 a week. By how many bags did it reduce?', o: ['21', '35', '14', '4'] },
    { q: 'A dripping tap wastes 3 litres every hour. How much water does it waste in one day?', o: ['72 litres', '27 litres', '48 litres', '96 litres'], x: '3 × 24 hours = 72 litres.' },
    { q: 'A cyclist rides 15 km in one hour. How far will she ride in 3 hours at the same speed?', o: ['45 km', '18 km', '30 km', '60 km'] },
    { q: 'What is 3/4 of 100 kg of compost?', o: ['75 kg', '25 kg', '34 kg', '70 kg'] },
    { q: 'A rainwater tank holds 500 litres. It is 2/5 full. How many litres are in it?', o: ['200 litres', '250 litres', '100 litres', '300 litres'], x: '500 ÷ 5 × 2 = 200.' },
    { q: 'What is the area of a rectangular garden 12 m long and 8 m wide?', o: ['96 square metres', '40 square metres', '20 square metres', '80 square metres'] },
    { q: 'A fence goes all around a garden 12 m long and 8 m wide. How long is the fence?', o: ['40 m', '96 m', '20 m', '48 m'], x: 'Perimeter = 2 × (12 + 8) = 40 m.' },
    { q: 'A bus carries 45 people. A car carries 3. How many cars carry the same number of people as one bus?', o: ['15', '13', '42', '48'] },
    { q: 'An LED bulb uses 9 watts and an old bulb uses 60 watts. How many watts does one switch save?', o: ['51 watts', '69 watts', '41 watts', '50 watts'] },
    { q: 'A class collected 12 kg, 15 kg and 18 kg of paper on three days. What is the average per day?', o: ['15 kg', '45 kg', '14 kg', '18 kg'] },
    { q: 'A class collected 3.5 kg of paper on Monday and 4.75 kg on Tuesday. What is the total?', o: ['8.25 kg', '7.25 kg', '8.75 kg', '7.8 kg'] },
    { q: 'The temperature rose from 28°C to 35°C. By how many degrees did it rise?', o: ['7°C', '63°C', '6°C', '8°C'] },
    { q: 'Wet and dry waste in a colony are in the ratio 3 : 2. If the total is 50 kg, how much is wet waste?', o: ['30 kg', '20 kg', '25 kg', '15 kg'], x: '3 parts out of 5: 50 ÷ 5 × 3 = 30.' },
    { q: 'One tree gives shade to 4 people. How many trees are needed to shade 36 people?', o: ['9', '32', '40', '8'] },
    { q: 'Which number is the largest?', o: ['0.5', '0.45', '0.405', '0.054'] },
    { q: 'A pond has 64 fish. Half are moved to a new pond, then half of the rest are moved too. How many are left?', o: ['16', '32', '8', '48'] },
    { q: 'Solve: 12 × 5 − 20 ÷ 4', o: ['55', '10', '40', '65'], x: 'Divide first: 20 ÷ 4 = 5, then 60 − 5 = 55.' },
    { q: 'A forest of 1,200 hectares loses 10% to fire. How much forest remains?', o: ['1,080 hectares', '1,100 hectares', '120 hectares', '1,190 hectares'] },
    { q: 'What comes next? 3, 6, 12, 24, …', o: ['48', '30', '36', '27'] },
    { q: 'How many minutes are there in 2½ hours?', o: ['150', '120', '130', '250'] },
    { q: 'Drip irrigation uses 40% less water. A farmer used 500 litres before. How much does he use now?', o: ['300 litres', '200 litres', '460 litres', '340 litres'] },
    { q: 'Round 4,768 to the nearest hundred.', o: ['4,800', '4,700', '5,000', '4,770'] },
  ];

  const science = [
    { q: 'Which of these is a renewable source of energy?', o: ['Solar energy', 'Coal', 'Petrol', 'Natural gas'] },
    { q: 'Which gas do plants take in from the air to make their food?', o: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'] },
    { q: 'Which gas do plants release during photosynthesis?', o: ['Oxygen', 'Carbon dioxide', 'Smoke', 'Methane'] },
    { q: 'Water vapour cooling into tiny water droplets is called…', o: ['Condensation', 'Evaporation', 'Melting', 'Freezing'] },
    { q: 'Which of these is biodegradable?', o: ['Banana peel', 'Plastic bottle', 'Glass jar', 'Aluminium can'] },
    { q: 'In the food chain grass → deer → tiger, the deer is a…', o: ['Herbivore', 'Producer', 'Decomposer', 'Carnivore'] },
    { q: 'Which living things break down dead plants and animals?', o: ['Fungi and bacteria (decomposers)', 'Green plants (producers)', 'Deer and cows (herbivores)', 'Lions and tigers (carnivores)'] },
    { q: 'Which layer high in the atmosphere protects us from harmful ultraviolet rays?', o: ['The ozone layer', 'The cloud layer', 'The smog layer', 'The rain layer'] },
    { q: 'What is the main cause of acid rain?', o: ['Gases such as sulphur dioxide from burning fuels', 'Too much oxygen in the air', 'Strong sunlight', 'Planting too many trees'] },
    { q: 'Which part of a plant usually makes its food?', o: ['Leaf', 'Root', 'Stem', 'Flower'] },
    { q: 'At sea level, pure water boils at…', o: ['100°C', '50°C', '0°C', '212°C'] },
    { q: 'Which of these is a greenhouse gas?', o: ['Methane', 'Oxygen', 'Nitrogen', 'Helium'] },
    { q: 'Too much fertiliser washing into a lake often causes…', o: ['Algal blooms that use up the oxygen fish need', 'More fish to grow', 'Cleaner, clearer water', 'The lake to freeze'] },
    { q: 'Which device turns sunlight directly into electricity?', o: ['Solar (photovoltaic) cell', 'Wind turbine', 'Dynamo', 'Electric motor'] },
    { q: 'The roots of trees help to prevent…', o: ['Soil erosion', 'Rainfall', 'Earthquakes', 'Sunlight'] },
    { q: 'Which animal is an amphibian?', o: ['Frog', 'Snake', 'Crocodile', 'Turtle'] },
    { q: 'Which gas makes up most of the air around us?', o: ['Nitrogen', 'Oxygen', 'Carbon dioxide', 'Hydrogen'] },
    { q: 'Burning plastic is harmful mainly because it…', o: ['Releases toxic gases', 'Produces fresh air', 'Makes soil fertile', 'Cleans the air'] },
    { q: 'Which material is the best conductor of electricity?', o: ['Copper', 'Wood', 'Rubber', 'Plastic'] },
    { q: 'Our skin makes which vitamin with the help of sunlight?', o: ['Vitamin D', 'Vitamin C', 'Vitamin A', 'Vitamin K'] },
    { q: 'Compost is formed by the action of…', o: ['Microorganisms such as bacteria and fungi', 'Sunlight alone', 'Plastic', 'Salt'] },
    { q: 'Which non-renewable resource is formed from ancient plants buried for millions of years?', o: ['Coal', 'Sunlight', 'Wind', 'Flowing water'] },
    { q: 'Earthworms are called "friends of farmers" because they…', o: ['Loosen and enrich the soil', 'Eat the crops', 'Spread diseases', 'Make the soil hard'] },
    { q: 'The water cycle is driven mainly by energy from…', o: ['The Sun', 'The Moon', 'Wind turbines', 'Volcanoes'] },
    { q: 'Plants lose water vapour through tiny pores in their leaves. This is called…', o: ['Transpiration', 'Germination', 'Pollination', 'Digestion'] },
  ];

  const english = [
    { q: 'Choose the word that means the opposite of "pollute".', o: ['Purify', 'Spoil', 'Dirty', 'Poison'] },
    { q: 'What is the plural of "leaf"?', o: ['Leaves', 'Leafs', 'Leafes', 'Leafies'] },
    { q: 'Which spelling is correct?', o: ['Environment', 'Enviroment', 'Envirnoment', 'Environmant'] },
    { q: 'Fill in the blank: "We should ___ water while brushing our teeth."', o: ['save', 'waste', 'spill', 'pour'] },
    { q: 'Choose a word that means the same as "conserve".', o: ['Protect', 'Destroy', 'Ignore', 'Spend'] },
    { q: 'Fill in the blank: "The river ___ flowing towards the sea."', o: ['is', 'are', 'am', 'be'] },
    { q: 'Which word is a verb? "The children plant trees every year."', o: ['plant', 'children', 'trees', 'year'] },
    { q: 'What is the past tense of "grow"?', o: ['grew', 'growed', 'growing', 'grows'] },
    { q: 'Complete the eco-motto: "Reduce, reuse and ___."', o: ['recycle', 'rebuild', 'replay', 'remove'] },
    { q: 'Fill in the blank: "She planted ___ orange tree."', o: ['an', 'a', 'many', 'much'] },
    { q: 'Choose the opposite of "scarce".', o: ['Plentiful', 'Rare', 'Little', 'Few'] },
    { q: 'What does "biodiversity" mean?', o: ['The variety of living things in an area', 'The study of rocks', 'A type of pollution', 'A kind of energy'] },
    { q: 'Which sentence is punctuated correctly?', o: ['Save water, save life!', 'save water save life', 'Save, water save life', 'save water, Save life.'] },
    { q: 'What does "deforestation" mean?', o: ['Cutting down forests on a large scale', 'Planting new forests', 'Watering forests', 'Studying forests'] },
    { q: 'Which word rhymes with "tree"?', o: ['bee', 'tray', 'tie', 'toe'] },
    { q: 'Choose the collective noun: "a ___ of birds".', o: ['flock', 'herd', 'school', 'pack'] },
    { q: 'Which of these is a compound word?', o: ['Sunlight', 'Water', 'Forest', 'River'] },
    { q: 'Fill in the blank: "If we plant more trees, the air ___ cleaner."', o: ['will be', 'was', 'were', 'been'] },
    { q: 'Which sentence is in the future tense?', o: ['We will clean the park tomorrow.', 'We cleaned the park.', 'We are cleaning the park.', 'We clean the park.'] },
    { q: 'Choose a word that means the same as "huge".', o: ['Enormous', 'Tiny', 'Weak', 'Narrow'] },
    { q: 'Fill in the blank: "The Sun rises ___ the east."', o: ['in', 'on', 'at', 'by'] },
    { q: 'In the word "recycle", the prefix "re-" means…', o: ['again', 'not', 'before', 'under'] },
  ];

  const hindi = [
    { q: '‘पानी’ का पर्यायवाची शब्द कौन-सा है?', h: 'Synonym of "water"', o: ['जल', 'अग्नि', 'वायु', 'धरती'] },
    { q: '‘स्वच्छ’ का विलोम शब्द क्या है?', h: 'Opposite of "clean"', o: ['गंदा', 'साफ़', 'सुंदर', 'नया'] },
    { q: '‘पेड़’ का पर्यायवाची शब्द चुनिए।', h: 'Synonym of "tree"', o: ['वृक्ष', 'पत्ता', 'फूल', 'जड़'] },
    { q: '‘आकाश’ का पर्यायवाची शब्द चुनिए।', h: 'Synonym of "sky"', o: ['गगन', 'धरती', 'सागर', 'पवन'] },
    { q: '‘सूर्य’ का पर्यायवाची शब्द चुनिए।', h: 'Synonym of "sun"', o: ['रवि', 'चंद्र', 'तारा', 'बादल'] },
    { q: '‘दिन’ का विलोम शब्द क्या है?', h: 'Opposite of "day"', o: ['रात', 'सुबह', 'शाम', 'दोपहर'] },
    { q: '‘नदी’ का बहुवचन क्या है?', h: 'Plural of "river"', o: ['नदियाँ', 'नदीयां', 'नदिओं', 'नदीएँ'] },
    { q: '‘हवा’ का पर्यायवाची शब्द चुनिए।', h: 'Synonym of "air"', o: ['पवन', 'पानी', 'आग', 'मिट्टी'] },
    { q: 'सही वर्तनी वाला शब्द चुनिए।', h: 'Pick the correct spelling of "environment"', o: ['पर्यावरण', 'पर्यावर्ण', 'परयावरण', 'पर्यवरण'] },
    { q: '‘धरती’ का पर्यायवाची शब्द चुनिए।', h: 'Synonym of "earth"', o: ['पृथ्वी', 'अंबर', 'नीर', 'अनल'] },
    { q: '‘आग’ का पर्यायवाची शब्द चुनिए।', h: 'Synonym of "fire"', o: ['अग्नि', 'जल', 'समीर', 'वन'] },
    { q: '‘जंगल’ का पर्यायवाची शब्द चुनिए।', h: 'Synonym of "forest"', o: ['वन', 'नगर', 'गाँव', 'पर्वत'] },
    { q: '‘ठंडा’ का विलोम शब्द क्या है?', h: 'Opposite of "cold"', o: ['गरम', 'ठंडक', 'शीतल', 'नरम'] },
    { q: '‘सुबह’ का विलोम शब्द क्या है?', h: 'Opposite of "morning"', o: ['शाम', 'दोपहर', 'सवेरा', 'प्रातः'] },
    { q: 'रिक्त स्थान भरिए: “पेड़ हमें ___ देते हैं।”', h: 'Fill in the blank: Trees give us ___', o: ['ऑक्सीजन', 'प्लास्टिक', 'धुआँ', 'कचरा'] },
    { q: '‘चिड़िया’ का बहुवचन क्या है?', h: 'Plural of "bird"', o: ['चिड़ियाँ', 'चिड़ियाएँ', 'चिड़ीयां', 'चिड़ियो'] },
    { q: '‘स्वच्छ भारत’ अभियान किससे जुड़ा है?', h: 'What is the Swachh Bharat campaign about?', o: ['सफ़ाई', 'खेल', 'संगीत', 'यात्रा'] },
    { q: 'प्रसिद्ध नारा पूरा कीजिए: “जल ही ___ है।”', h: 'Complete the famous slogan', o: ['जीवन', 'सोना', 'धन', 'खेल'] },
    { q: '‘मोर’ का स्त्रीलिंग शब्द क्या है?', h: 'Feminine of "peacock"', o: ['मोरनी', 'मोरी', 'मोराइन', 'मोरिन'] },
    { q: '‘शेर’ का स्त्रीलिंग शब्द क्या है?', h: 'Feminine of "lion"', o: ['शेरनी', 'शेरी', 'शेरा', 'शेरिन'] },
    { q: '‘बारिश’ का पर्यायवाची शब्द चुनिए।', h: 'Synonym of "rain"', o: ['वर्षा', 'धूप', 'आँधी', 'ओस'] },
    { q: '‘फूल’ का पर्यायवाची शब्द चुनिए।', h: 'Synonym of "flower"', o: ['पुष्प', 'पत्र', 'फल', 'काँटा'] },
    { q: '‘गाय’ शब्द कौन-सी संज्ञा है?', h: 'What kind of noun is "cow"?', o: ['जातिवाचक संज्ञा', 'व्यक्तिवाचक संज्ञा', 'भाववाचक संज्ञा', 'सर्वनाम'] },
  ];

  const social = [
    { q: 'Which river is often called the "Dakshin Ganga" (Ganga of the South)?', o: ['Godavari', 'Yamuna', 'Narmada', 'Brahmaputra'] },
    { q: 'The Chipko Movement was mainly about protecting…', o: ['Trees', 'Rivers', 'Tigers', 'Mountains'] },
    { q: 'Which is the longest river flowing in India?', o: ['Ganga', 'Godavari', 'Krishna', 'Yamuna'] },
    { q: 'On which day is World Environment Day celebrated?', o: ['5 June', '22 April', '15 August', '2 October'] },
    { q: 'In which year did India launch Project Tiger?', o: ['1973', '1947', '1991', '2005'] },
    { q: 'What is the national animal of India?', o: ['Tiger', 'Lion', 'Elephant', 'Peacock'] },
    { q: 'What is the national bird of India?', o: ['Peacock', 'Parrot', 'Eagle', 'Sparrow'] },
    { q: 'Which local body looks after a village?', o: ['Gram Panchayat', 'Municipal Corporation', 'Parliament', 'Supreme Court'] },
    { q: 'Who usually manages waste collection in a large city?', o: ['The Municipal Corporation', 'The Gram Panchayat', 'The Supreme Court', 'The Election Commission'] },
    { q: 'The Thar Desert lies mainly in which state?', o: ['Rajasthan', 'Kerala', 'Assam', 'Punjab'] },
    { q: 'The Sundarbans mangrove forest is in which Indian state?', o: ['West Bengal', 'Gujarat', 'Kerala', 'Punjab'] },
    { q: 'Silent Valley National Park is in which state?', o: ['Kerala', 'Rajasthan', 'Bihar', 'Haryana'] },
    { q: 'When was the Swachh Bharat Mission launched?', o: ['2 October 2014', '26 January 1950', '15 August 1947', '5 June 2000'] },
    { q: 'Which of these crops needs the most water to grow?', o: ['Rice (paddy)', 'Pearl millet (bajra)', 'Mustard', 'Gram'] },
    { q: 'What does rainwater harvesting mean?', o: ['Collecting and storing rainwater for later use', 'Letting rainwater run into drains', 'Boiling rainwater', 'Making artificial rain'] },
    { q: 'Which ocean lies to the south of India?', o: ['Indian Ocean', 'Pacific Ocean', 'Atlantic Ocean', 'Arctic Ocean'] },
    { q: 'Which plateau covers much of southern India?', o: ['Deccan Plateau', 'Tibetan Plateau', 'Colorado Plateau', 'Patagonian Plateau'] },
    { q: 'Who is known as a leader of the Chipko Movement?', o: ['Sunderlal Bahuguna', 'C. V. Raman', 'Milkha Singh', 'R. K. Narayan'] },
    { q: 'The Bishnoi community of Rajasthan is famous for protecting…', o: ['Trees and wildlife', 'Factories', 'Highways', 'Mines'] },
    { q: 'A "sustainable" practice is one that…', o: ['Meets today\'s needs without harming future generations', 'Uses resources as fast as possible', 'Only helps factories', 'Avoids all farming'] },
    { q: 'Which is a fair way to share limited water in a village?', o: ['Make a schedule so every family gets a turn', 'Let the strongest families take the most', 'Give water only to rich families', 'Use it up before others can'] },
    { q: 'Which mountain range lies along the north of India?', o: ['Himalayas', 'Andes', 'Alps', 'Rockies'] },
  ];

  const rishi = [
    { q: 'A tap is running in the school washroom and nobody is using it. What is the wise thing to do?', o: ['Close it, and tell the caretaker if it leaks', 'Ignore it', 'Leave it — someone else will close it', 'Open the other taps too'] },
    { q: 'The ancient saying "Vasudhaiva Kutumbakam" means…', o: ['The world is one family', 'Water is life', 'Knowledge is power', 'Work is worship'] },
    { q: 'A friend throws a wrapper on the road. What should you do?', o: ['Politely remind them and help put it in a dustbin', 'Throw yours on the road too', 'Laugh about it', 'Shout at them angrily'] },
    { q: 'Why should we respect all living beings?', o: ['Every creature has a role in nature\'s balance', 'Because they can be sold', 'Only big animals matter', 'We do not need to'] },
    { q: 'Which habit shows responsibility towards nature?', o: ['Carrying a cloth bag when shopping', 'Taking a new plastic bag every day', 'Leaving lights on in empty rooms', 'Burning dry leaves'] },
    { q: 'In the story of the thirsty crow, the crow succeeded because of…', o: ['Clever thinking and patience', 'Anger', 'Luck alone', 'Help from a lion'] },
    { q: 'What is the best way to celebrate festivals responsibly?', o: ['Use eco-friendly decorations and keep noise low', 'Burst as many crackers as possible', 'Throw leftover offerings into rivers', 'Use plastic decorations and throw them away'] },
    { q: 'The word "Ahimsa" means…', o: ['Non-violence', 'Truth', 'Courage', 'Wealth'] },
    { q: 'A library book you borrowed gets torn. What is the honest thing to do?', o: ['Tell the librarian and help repair it', 'Hide it', 'Blame someone else', 'Throw it away'] },
    { q: 'A wise person uses resources…', o: ['Only as much as is needed', 'As much as possible', 'Never at all', 'Without thinking'] },
    { q: '"Boond boond se sagar banta hai" (drop by drop, an ocean is formed) teaches us that…', o: ['Small efforts add up to big results', 'Oceans are made only of rain', 'We can waste water freely', 'Only big actions count'] },
    { q: 'After planting a tree, the most important thing to do is…', o: ['Water and care for it until it grows strong', 'Forget about it', 'Cut it next year', 'Paint it'] },
    { q: 'Which choice shows empathy?', o: ['Sharing your umbrella with a friend in the rain', 'Laughing at someone who fell', 'Ignoring a crying child', 'Taking someone\'s lunch'] },
    { q: 'The Sun gives light to all without asking for anything. This teaches us…', o: ['Selfless giving', 'Pride', 'Laziness', 'Greed'] },
    { q: 'Many traditions honour rivers as mothers. This should inspire us to…', o: ['Keep rivers clean and treat them with respect', 'Throw plastic offerings into them', 'Build factories on their banks', 'Waste river water'] },
    { q: 'What is a good way to settle an argument with a friend?', o: ['Listen calmly and talk it through', 'Shout louder', 'Stop talking forever', 'Complain to everyone'] },
  ];

  const eco = [
    { q: 'Your school canteen throws away a lot of food every day. Suggest two practical ways to reduce or use this waste.', sample: 'Serve smaller portions with second helpings available; compost leftovers for the school garden; donate surplus food safely.' },
    { q: 'The lake near your colony is full of plastic. Plan two steps your community can take.', sample: 'Organise a clean-up drive with proper segregation; put bins and signboards near the lake; ask the municipality to stop dumping and fine litterers.' },
    { q: 'Your area faces water shortages every summer. Suggest two ways to save water at home.', sample: 'Fix leaking taps; reuse RO reject or washing water for plants and cleaning; use a bucket instead of a hose; harvest rainwater.' },
    { q: 'Air pollution rises near your school during rush hour. Suggest two solutions.', sample: 'School buses and carpools; walking or cycling groups; a no-idling zone at the gate; plant trees along the boundary.' },
    { q: 'The electricity bill at home is very high. Suggest two ways to cut energy use.', sample: 'Switch to LED bulbs; switch off fans, lights and chargers when not in use; use daylight; choose star-rated appliances.' },
    { q: 'Farmers in a village burn crop stubble after harvest. Suggest a better alternative.', sample: 'Mix stubble into the soil or compost it; use it as cattle fodder or mulch; sell it to biomass plants; use machines such as the Happy Seeder.' },
    { q: 'Birds in your neighbourhood find no water in the hot summer. What can you do?', sample: 'Keep shallow bowls of clean water in the shade and refill them daily; plant native trees that give shade and fruit.' },
    { q: 'Your housing society puts wet and dry waste in one bin. How would you convince everyone to segregate?', sample: 'Give a short awareness talk; provide two colour-coded bins; show how wet waste becomes free compost for the garden.' },
    { q: 'A neighbourhood park is going to be cleared for car parking. Suggest a fair solution that protects green cover.', sample: 'Build multi-level or underground parking elsewhere; keep the trees; petition the municipal body with residents\' signatures.' },
    { q: 'Many students throw away notebooks that still have empty pages. Suggest a way to reuse them.', sample: 'Collect unused pages and bind them into rough notebooks; donate them; recycle the rest.' },
    { q: 'The village pond dries up every year. Suggest two ways to revive it.', sample: 'Remove silt to deepen the pond; channel rooftop and field rainwater into it; build small check dams; plant trees around it.' },
    { q: 'Festival idols painted with chemicals are immersed in the river. Suggest an eco-friendly alternative.', sample: 'Use clay idols with natural colours; immerse them in artificial tanks or a bucket at home; reuse the clay.' },
    { q: 'Classroom fans and lights stay on during the lunch break. Design a simple system to fix this.', sample: 'Appoint weekly "energy monitors"; put reminder stickers near switches; the last person out switches off.' },
    { q: 'Old clothes are piling up at home. Suggest three eco-friendly uses for them.', sample: 'Donate wearable clothes; sew cloth bags; use worn-out cloth as cleaning rags or for craft.' },
  ].map((c) => Object.assign({ kind: 'judge', time: 75, input: true, bonus: true, placeholder: 'Type your solution, or explain it aloud…' }, c));

  const action = [
    { q: 'Mime the water cycle — evaporation, clouds and rain — without speaking. Others must guess what you are acting.', time: 45, sample: 'Others guess "water cycle", or name its stages.' },
    { q: 'Draw a food chain with at least three living things, linked by arrows.', time: 60, sample: 'For example: grass → grasshopper → frog → snake. Arrows point towards the eater.' },
    { q: 'Sing or chant a two-line rhyme about saving trees.', time: 45, sample: 'Any two rhyming lines about trees.' },
    { q: 'Act like a tree swaying in a storm, then show it standing tall when the storm passes.', time: 30, sample: 'Clear swaying, then a strong, still stance.' },
    { q: 'Mime planting a seed and watering it until it grows into a plant. Others must guess.', time: 40, sample: 'Others guess "planting / growing a plant".' },
    { q: 'Draw a simple "Save Water" symbol that anyone could understand without words.', time: 45, sample: 'For example a drop with a heart, or a tap with a cross.' },
    { q: 'Clap the rhythm "Re-duce, Re-use, Re-cy-cle" three times without a mistake.', time: 30, sample: 'Three clean repetitions.' },
    { q: 'Mime three ways to save electricity at home. Others must name all three.', time: 60, sample: 'For example switching off lights, unplugging chargers, using daylight.' },
    { q: 'Walk like an elephant, hop like a frog and fly like a bird — in that order.', time: 30, sample: 'All three, in the right order.' },
    { q: 'Draw a sustainable house showing at least two green features.', time: 60, sample: 'For example solar panels, a rain barrel, a kitchen garden, big windows for daylight.' },
    { q: 'Without speaking, act out separating rubbish into wet and dry bins.', time: 40, sample: 'Clear sorting into two different bins.' },
    { q: 'Make the sounds of three forest animals. Others must guess each animal.', time: 30, sample: 'Three animals guessed correctly.' },
    { q: 'Hold the tree pose (Vrikshasana) on one leg for 10 seconds.', time: 30, sample: 'Balanced for a count of 10.' },
    { q: 'Draw the Earth and write one promise to protect it.', time: 60, sample: 'A drawing plus one clear promise.' },
    { q: 'Mime a bee pollinating flowers. Others must guess.', time: 30, sample: 'Others guess "bee" or "pollination".' },
    { q: 'Create a four-beat chant with actions about clean air.', time: 45, sample: 'A short rhythmic chant with matching actions.' },
    { q: 'Draw a map of your dream green school with a garden, a compost pit and a rainwater tank.', time: 75, sample: 'All three features shown.' },
    { q: 'Act out the journey of a plastic bottle that gets recycled into a T-shirt.', time: 60, sample: 'Collected → sorted → shredded → spun into fibre → T-shirt.' },
  ].map((c) => Object.assign({ kind: 'judge' }, c));

  const teamwork = [
    { q: 'Together, name 6 clean or renewable energy sources in 45 seconds.', time: 45, sample: 'Solar, wind, hydro (water), biogas, geothermal, tidal, wave, biomass.' },
    { q: 'As a team, list 8 things that can go into a compost pit in 60 seconds.', time: 60, sample: 'Vegetable peels, fruit scraps, tea leaves, coffee grounds, dry leaves, eggshells, grass clippings, sawdust.' },
    { q: 'Plan a fair way for 4 families to share one water tanker so every family gets water every day. Explain your plan.', time: 75, sample: 'A rotating order each day, equal measured portions, priority for drinking and cooking, a shared record.' },
    { q: 'Name 5 Indian rivers in 30 seconds. Every player must say at least one.', time: 30, sample: 'Ganga, Yamuna, Godavari, Krishna, Kaveri, Narmada, Brahmaputra, Mahanadi…' },
    { q: 'Together, compose a four-line poem about forests.', time: 75, sample: 'Four lines on forests, ideally with rhyme.' },
    { q: 'Name 6 animals found in Indian forests in 30 seconds.', time: 30, sample: 'Tiger, elephant, leopard, sloth bear, deer, langur, peacock, king cobra…' },
    { q: 'Make a human food chain: each player acts one link and says what it eats.', time: 60, sample: 'A correct chain from a producer to a top consumer.' },
    { q: 'Agree on three rules for a plastic-free classroom and explain why each one helps.', time: 60, sample: 'Steel bottles, cloth or paper wrapping, no single-use cutlery — each with a reason.' },
    { q: 'Count backwards from 50 in steps of 5, taking turns one number each, without a mistake.', time: 30, sample: '50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0.' },
    { q: 'Together, list 6 ways to save water at school in 45 seconds.', time: 45, sample: 'Close taps, fix leaks, reuse water for plants, rain harvesting, buckets not hoses, awareness posters.' },
  ].map((c) => Object.assign({ kind: 'judge' }, c));

  // ---------- Tapasya Trial pools ----------
  const tapasyaAcademic = [
    { q: 'A tank holds 360 litres. One-third is used for plants, then one-quarter of what remains for cleaning. How much is left?', o: ['180 litres', '150 litres', '210 litres', '240 litres'], x: '360 − 120 = 240; 240 − 60 = 180.' },
    { q: 'Which gas makes up about 21% of the air?', o: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Argon'] },
    { q: 'Fill in the blank: "Despite the heavy rain, the farmers ___ happy."', o: ['were', 'was', 'is', 'has'] },
    { q: '‘उपकार’ का विलोम शब्द क्या है?', h: 'Opposite of "kindness / favour"', o: ['अपकार', 'आभार', 'सहकार', 'विकार'] },
    { q: 'Which line of latitude passes through the middle of India?', o: ['Tropic of Cancer', 'Equator', 'Prime Meridian', 'Arctic Circle'] },
    { q: 'What is 15% of 240?', o: ['36', '24', '30', '42'] },
    { q: 'Which of these is NOT a fossil fuel?', o: ['Biogas', 'Coal', 'Petroleum', 'Natural gas'] },
    { q: 'Fill in the blank: "The children were ___ by the beauty of the forest."', o: ['amazed', 'amaze', 'amazing', 'amazes'] },
    { q: 'A car travels 180 km on 12 litres of petrol. How many km does it travel per litre?', o: ['15', '12', '18', '21'] },
    { q: 'Which organs filter waste from our blood?', o: ['Kidneys', 'Lungs', 'Stomach', 'Heart'] },
    { q: 'Which Indian state usually receives the first monsoon showers?', o: ['Kerala', 'Gujarat', 'Punjab', 'Rajasthan'] },
    { q: '‘जो ईश्वर में विश्वास करता हो’ — इसके लिए एक शब्द चुनिए।', h: 'One word for "one who believes in God"', o: ['आस्तिक', 'नास्तिक', 'आलसी', 'अज्ञानी'] },
  ];

  const tapasyaEnv = [
    { q: 'If all the bees in an area disappeared, what would happen first?', o: ['Many plants would produce fewer fruits and seeds', 'Rainfall would increase', 'The soil would turn to sand overnight', 'Rivers would dry up'] },
    { q: 'A factory releases warm water into a river. Why might fish die?', o: ['Warm water holds less dissolved oxygen', 'Warm water is too clean', 'Fish dislike sunlight', 'Warm water has more food'] },
    { q: 'Why is a forest cooler than a city on a hot day?', o: ['Trees give shade and release water vapour', 'Forests have more concrete', 'Animals cool the air', 'No sunlight reaches a forest'] },
    { q: 'All the snakes on a farm are killed. What is a likely result?', o: ['Rats multiply and damage the crops', 'Crops grow faster', 'More rain falls', 'Fewer insects survive'] },
    { q: 'Why does cutting trees on hill slopes lead to landslides?', o: ['Tree roots no longer hold the soil together', 'Trees attract heavy rain', 'The hills become heavier', 'Animals dig more holes'] },
    { q: 'Which choice uses the least energy for a 2 km trip?', o: ['Cycling', 'Driving alone in a car', 'Taking a taxi', 'Riding a motorbike'] },
    { q: 'Why should used batteries not go into the regular dustbin?', o: ['Their chemicals can leak into soil and water', 'They are too heavy', 'Cows can eat them safely', 'They turn into fertiliser'] },
    { q: 'A city replaces concrete drains with rain gardens. What is the main benefit?', o: ['More rainwater soaks into the ground', 'More mosquitoes breed', 'Fewer plants grow', 'The streets get hotter'] },
    { q: 'Why do mangrove forests matter to coastal villages?', o: ['They reduce damage from storms and waves', 'They block all sunlight', 'They add salt to drinking water', 'They attract pollution'] },
    { q: 'Using a refillable bottle instead of buying bottled water for a year mainly reduces…', o: ['Plastic waste', 'Rainfall', 'Soil fertility', 'Oxygen in the air'] },
  ];

  // ---------- Mahashakti cards (five stages each) ----------
  const mahashakti = [
    {
      title: 'Restore the Sacred River',
      scenario: 'A river near an Indian village has become polluted. Fish are dying, drinking water is becoming unsafe, and farmers are struggling. Your mission is to restore balance.',
      stages: [
        { label: 'Gyaan', q: 'A village uses 800 litres of water daily. It reduces its daily water use by 25%. How many litres does it save?', o: ['200 litres', '600 litres', '250 litres', '175 litres'] },
        { label: 'Vigyaan', q: 'Which explains two ways pollution harms aquatic life?', o: ['Toxic chemicals poison water creatures, and fertiliser runoff causes algal blooms that use up dissolved oxygen', 'Pollution makes the water colder, so fish grow faster', 'Plastic gives fish extra food and shelter', 'Pollution adds oxygen, so fish need to swim less'] },
        { label: 'Vaani', kind: 'judge', input: true, time: 60, q: 'Write a short environmental slogan in English or Hindi to save the river.', sample: 'Example: "Save every drop, let pollution stop!"' },
        { label: 'Dharma', q: 'Which two actions should the village and local government take to reduce river pollution?', o: ['Treat sewage before it reaches the river and stop waste dumping', 'Build more factories on the riverbank', 'Wash vehicles and cattle in the river', 'Dump festival waste into the river'] },
        { label: 'Ekagrata', kind: 'mem-seq', words: ['River', 'Tree', 'Sun', 'Soil', 'Rain'], show: 6, delay: 15 },
      ],
    },
    {
      title: 'Revive the Sacred Forest',
      scenario: 'A forest that shelters tigers, birds and medicinal plants is shrinking. Springs are drying and the village is losing its shade. Bring the forest back to life.',
      stages: [
        { label: 'Gyaan', q: 'A forest had 2,400 trees. 15% were cut down, then volunteers planted 500 saplings. How many trees are there now?', o: ['2,540', '2,040', '2,900', '2,140'], x: '15% of 2,400 = 360; 2,400 − 360 = 2,040; + 500 = 2,540.' },
        { label: 'Vigyaan', q: 'How do forests help bring rain?', o: ['Trees release water vapour through transpiration, which helps clouds form', 'Trees attract lightning, which makes rain', 'Leaves store rain for months and drop it later', 'Forest animals breathe out clouds'] },
        { label: 'Vaani', kind: 'judge', input: true, time: 60, q: 'Write a two-line slogan or poem about forests in English or Hindi.', sample: 'Example: "Plant a tree, set nature free!"' },
        { label: 'Dharma', q: 'Which is the fairest way to stop illegal tree felling?', o: ['A village forest committee works with forest officials, and villagers earn from forest produce sustainably', 'Let anyone cut trees freely', 'Burn the forest to clear it for farms', 'Ignore it — it is the government\'s problem'] },
        { label: 'Ekagrata', kind: 'mem-seq', words: ['Seed', 'Root', 'Leaf', 'Bird', 'Nest'], show: 6, delay: 15 },
      ],
    },
    {
      title: 'Clear the Smoky Skies',
      scenario: 'Smoke from traffic, garbage fires and factories hangs over the town. Children are coughing and the stars have disappeared. Clear the skies.',
      stages: [
        { label: 'Gyaan', q: 'After a car-free week, the town\'s air quality index fell from 320 to 240. By what percentage did it fall?', o: ['25%', '80%', '20%', '33%'], x: '320 − 240 = 80; 80 ÷ 320 = 25%.' },
        { label: 'Vigyaan', q: 'Why are PM2.5 particles harmful?', o: ['They are so tiny they can travel deep into our lungs and even our blood', 'They are large and block the roads', 'They make the sky bluer', 'They add oxygen to the air'] },
        { label: 'Vaani', kind: 'judge', input: true, time: 60, q: 'Create a slogan for a clean-air campaign in English or Hindi.', sample: 'Example: "Less smoke, more hope!"' },
        { label: 'Dharma', q: 'Which plan would reduce city air pollution most fairly?', o: ['More buses and metro, plus safe cycle lanes', 'Ban every vehicle for everyone forever', 'Burn garbage at night when no one sees', 'Cut down roadside trees to widen roads'] },
        { label: 'Ekagrata', kind: 'mem-seq', words: ['Wind', 'Cloud', 'Mountain', 'Bicycle', 'Sky'], show: 6, delay: 15 },
      ],
    },
    {
      title: 'Light Up the Village',
      scenario: 'A remote village has frequent power cuts. Children study by smoky kerosene lamps. Bring clean light and energy to every home.',
      stages: [
        { label: 'Gyaan', q: '20 houses each replace five 60 W bulbs with 9 W LED bulbs. How many watts are saved in total?', o: ['5,100 W', '1,020 W', '6,000 W', '900 W'], x: '60 − 9 = 51 W per bulb; 51 × 5 × 20 = 5,100 W.' },
        { label: 'Vigyaan', q: 'How does a solar panel produce electricity?', o: ['Its solar cells convert sunlight directly into electricity', 'It burns sunlight like a fuel', 'It only heats water', 'It needs wind to spin it'] },
        { label: 'Vaani', kind: 'judge', input: true, time: 60, q: 'Give a slogan for saving electricity, in English or Hindi.', sample: 'Example: "Switch off, save power, brighten every hour!"' },
        { label: 'Dharma', q: 'How should the village share a small solar mini-grid fairly?', o: ['Power essentials first — the school, the clinic and a light in every home', 'Give all the power to one rich family', 'Leave it switched off to save it', 'Sell all the power to the city'] },
        { label: 'Ekagrata', kind: 'mem-seq', words: ['Sun', 'Panel', 'Wire', 'Lamp', 'Book'], show: 6, delay: 15 },
      ],
    },
  ];

  // ---------- Grand Green Challenge ----------
  const grandScience = [
    { q: 'How can organic waste be turned into compost?', o: ['Microorganisms break it down in a pit or bin with air and moisture, making compost that enriches soil', 'By burning it in the open', 'By sealing it in plastic bags', 'By dumping it in a river'] },
    { q: 'Which item should NOT go into a compost pit?', o: ['A plastic wrapper', 'Vegetable peels', 'Dry leaves', 'Used tea leaves'] },
    { q: 'Why should a compost heap be turned over regularly?', o: ['To give air to the microorganisms so they break down waste faster', 'To make it smell worse', 'To keep birds away', 'To help plastic rot'] },
  ];
  const grandSocial = [
    { q: 'Which action can the local government take to improve waste management?', o: ['Collect wet and dry waste separately and process each properly', 'Dump all waste outside the town', 'Burn waste in open grounds', 'Stop collecting waste'] },
    { q: 'Which local body manages waste collection in a village?', o: ['Gram Panchayat', 'Supreme Court', 'Election Commission', 'Reserve Bank of India'] },
    { q: 'How does door-to-door waste collection help a town?', o: ['Segregated waste is collected regularly from every home', 'Waste piles up on the streets', 'People are encouraged to burn waste', 'Recycling units are closed'] },
  ];

  // Waste-management rules: one is revealed when a realm is first entered.
  const DHARA_RULES = {
    prithvi: 'Segregate waste at source — wet waste in the green bin, dry waste in the blue bin.',
    jal: 'Never throw waste, plastic or chemicals into rivers, lakes or drains.',
    vayu: 'Never burn garbage or dry leaves — the smoke poisons the air.',
    agni: 'Give used batteries and e-waste only to authorised e-waste collectors.',
    vana: 'Compost kitchen and garden waste to return nutrients to the soil.',
    akasha: 'Refuse single-use plastic — carry your own cloth bag and bottle.',
    jana: 'Clean and dry recyclables like paper, metal and glass before giving them to a recycler.',
    vidya: 'Reuse and repair things before you throw them away.',
  };
  const RULE_DECOYS = [
    'Mix all waste in one bag so it is easier to carry.',
    'Burn plastic so that it disappears safely.',
    'Pour used cooking oil and paint down the drain.',
    'Flush plastic wrappers down the toilet.',
    'Use both sides of every sheet of paper before recycling it.',
    'Turn off the tap while brushing your teeth.',
    'Buy new things instead of repairing old ones.',
  ];

  // ---------- procedural Memory & Concentration tasks ----------
  const WORDS = ['River', 'Tree', 'Sun', 'Soil', 'Rain', 'Cloud', 'Seed', 'Leaf', 'Bird', 'Wind', 'Mountain', 'Lotus', 'Tiger', 'Peacock', 'Forest', 'Ocean', 'Bee', 'Flower', 'Earth', 'Moon', 'Lake', 'Rock', 'Fish', 'Owl', 'Deer', 'Monsoon', 'Banyan', 'Elephant', 'Honey', 'Sky'];
  const EMOJI = ['🌳', '🌴', '🌵', '🌻', '🌷', '🍀', '🍁', '🌾', '💧', '🌈', '🐘', '🐅', '🦚', '🐢', '🦉', '🦌', '🐝', '🦋', '🐟', '🐸', '🦜', '🌍', '🔥', '⚡', '♻️', '🍄', '🌙', '⭐', '🐒', '🦀', '🐍', '🌽'];
  const ODD_PAIRS = [['🌳', '🌲'], ['💧', '💦'], ['🐟', '🐠'], ['🌻', '🌼'], ['🍁', '🍂'], ['🌷', '🌹'], ['🐘', '🦏'], ['🍎', '🍅']];
  const NUMBER_FACTS = [
    ['A wetland sanctuary is home to {n} migratory birds.', 'How many migratory birds live in the sanctuary?'],
    ['Volunteers planted {n} saplings along the river bank.', 'How many saplings were planted?'],
    ['The village rain tank collected {n} litres of water this monsoon.', 'How many litres did the rain tank collect?'],
    ['A forest survey counted {n} trees in the Vana realm.', 'How many trees were counted?'],
    ['Students recycled {n} plastic bottles in one year.', 'How many bottles were recycled?'],
  ];

  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rand(arr.length)]; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function sample(arr, n, exclude) {
    return shuffle(arr.filter((v) => !(exclude || []).includes(v))).slice(0, n);
  }
  function fmt(n) { return n.toLocaleString('en-IN'); }

  function numberVariants(n) {
    const s = String(n).split('');
    const out = new Set();
    let guard = 0;
    while (out.size < 3 && guard++ < 50) {
      const t = s.slice();
      const i = rand(t.length - 1);
      if (rand(2)) { [t[i], t[i + 1]] = [t[i + 1], t[i]]; } else { t[i + 1] = String((Number(t[i + 1]) + 1 + rand(8)) % 10); }
      if (t[0] === '0') continue;
      const v = Number(t.join(''));
      if (v !== n) out.add(v);
    }
    return [...out];
  }

  const generators = {
    'mem-seq': (opts) => {
      const n = (opts && opts.n) || 4;
      const words = (opts && opts.words) || sample(WORDS, n);
      return { kind: 'mem-seq', words, pool: shuffle(words.concat(sample(WORDS, 3, words))), show: (opts && opts.show) || words.length + 2, delay: (opts && opts.delay) || 0, time: 30 };
    },
    'mem-missing': () => {
      const shown = sample(EMOJI, 6);
      const missing = sample(EMOJI, 1, shown)[0];
      return { kind: 'mem-missing', shown, show: 6, time: 25, q: 'Which one did NOT appear?', o: [missing].concat(sample(shown, 3)) };
    },
    'mem-grid': () => {
      const cells = sample(EMOJI, 9);
      const ask = rand(9);
      return { kind: 'mem-grid', cells, ask, show: 8, time: 25, q: 'What was in the highlighted square?', o: [cells[ask]].concat(sample(cells, 3, [cells[ask]])) };
    },
    'mem-number': () => {
      const n = 1000 + rand(9000);
      const f = pick(NUMBER_FACTS);
      return { kind: 'mem-number', fact: f[0].replace('{n}', fmt(n)), show: 5, time: 25, q: f[1], o: [n].concat(numberVariants(n)).map(fmt) };
    },
    'con-odd': () => {
      const pair = pick(ODD_PAIRS);
      const flip = rand(2);
      return { kind: 'con-odd', base: pair[flip], odd: pair[1 - flip], cols: 7, rows: 5, at: rand(35), time: 20 };
    },
    'con-count': () => {
      const kinds = sample(EMOJI, 3);
      const cells = Array.from({ length: 30 }, () => pick(kinds));
      const target = pick(kinds);
      const c = cells.filter((v) => v === target).length;
      const opts = new Set([c]);
      [1, -1, 2, -2, 3].forEach((d) => { if (opts.size < 4 && c + d > 0) opts.add(c + d); });
      return { kind: 'con-count', cells, target, time: 25, q: `How many ${target} can you count?`, o: [...opts].map(String) };
    },
    'con-pattern': () => {
      const type = rand(5);
      let seq, ans, wrong;
      if (type === 0) {
        const a = 2 + rand(9), d = 2 + rand(8);
        seq = [a, a + d, a + 2 * d, a + 3 * d]; ans = a + 4 * d; wrong = [ans + d + 1, ans - 1, ans + 2];
      } else if (type === 1) {
        const a = 2 + rand(4);
        seq = [a, a * 2, a * 4, a * 8]; ans = a * 16; wrong = [a * 10, a * 12, a * 14];
      } else if (type === 2) {
        const s = 1 + rand(3);
        seq = [s * s, (s + 1) ** 2, (s + 2) ** 2, (s + 3) ** 2]; ans = (s + 4) ** 2; wrong = [ans - 2, ans + 3, (s + 3) ** 2 + (s + 3)];
      } else if (type === 3) {
        const a = 1 + rand(5);
        seq = [a, a + 1, a + 3, a + 6, a + 10]; ans = a + 15; wrong = [a + 14, a + 16, a + 13];
      } else {
        const e = sample(EMOJI, 3);
        const unit = rand(2) ? [e[0], e[1]] : [e[0], e[1], e[2]];
        const full = [];
        for (let i = 0; full.length < 7; i++) full.push(unit[i % unit.length]);
        seq = full.slice(0, 6); ans = full[6]; wrong = sample(EMOJI, 3, [ans]);
        return { kind: 'mcq', q: 'What comes next in the pattern?', display: seq.join('  ') + '  ❓', o: [ans].concat(wrong), time: 25 };
      }
      return { kind: 'mcq', q: 'What number comes next in the pattern?', display: seq.join(',  ') + ',  ?', o: [ans].concat(wrong).map(String), time: 25 };
    },
    'con-spot': () => {
      const row = Array.from({ length: 8 }, () => pick(EMOJI));
      const at = rand(8);
      const row2 = row.slice();
      row2[at] = sample(EMOJI, 1, [row[at]])[0];
      return { kind: 'con-spot', row, row2, at, time: 20 };
    },
  };

  function generate(kind, opts) { return Object.assign({ deck: kind.startsWith('mem') ? 'memory' : 'concentration' }, generators[kind](opts)); }

  const PROCEDURAL = {
    memory: ['mem-seq', 'mem-seq', 'mem-missing', 'mem-grid', 'mem-number'],
    concentration: ['con-odd', 'con-count', 'con-pattern', 'con-spot'],
  };

  const POOLS = { math, science, english, hindi, social, rishi, eco, action, teamwork };

  function cardFrom(deck, index) {
    const c = POOLS[deck][index];
    return Object.assign({ kind: 'mcq', deck }, c);
  }

  function drawProcedural(deck) {
    return generate(pick(PROCEDURAL[deck]));
  }

  function tapasyaStages(drawAction) {
    const third = pick(['mem-seq', 'con-odd', 'con-count', 'action']);
    return [
      Object.assign({ kind: 'mcq', deck: 'tapasya', label: 'Academic' }, pick(tapasyaAcademic)),
      Object.assign({ kind: 'mcq', deck: 'tapasya', label: 'Environment' }, pick(tapasyaEnv)),
      third === 'action'
        ? Object.assign({}, drawAction(), { label: 'Action', time: 40 })
        : Object.assign(generate(third, { n: 5 }), { label: third === 'mem-seq' ? 'Memory' : 'Concentration' }),
    ];
  }

  function mahashaktiCard(i) {
    const card = mahashakti[i % mahashakti.length];
    return {
      title: card.title,
      scenario: card.scenario,
      stages: card.stages.map((s) => (s.kind === 'mem-seq'
        ? Object.assign(generate('mem-seq', { words: s.words, show: s.show, delay: s.delay }), { label: s.label })
        : Object.assign({ kind: 'mcq', deck: 'mahashakti' }, s))),
    };
  }

  function grandStages(revealedKeys) {
    const w = 80 + rand(8) * 20;           // total waste, kg
    const r = 20 + rand(4) * 5;            // recyclable %
    const g = 35 + rand(4) * 5;            // organic %
    const rec = w * r / 100, org = w * g / 100, rest = w - rec - org;
    const ans = `Recyclable ${rec} kg · Organic ${org} kg · Remaining ${rest} kg`;
    const wrong = [
      `Recyclable ${r} kg · Organic ${g} kg · Remaining ${100 - r - g} kg`,
      `Recyclable ${org} kg · Organic ${rec} kg · Remaining ${rest} kg`,
      `Recyclable ${rec} kg · Organic ${org} kg · Remaining ${rest + 10} kg`,
    ].filter((v) => v !== ans);
    const revealed = revealedKeys.map((k) => DHARA_RULES[k]);
    const asked = sample(revealed, Math.min(3, revealed.length));
    const others = sample(RULE_DECOYS, 6 - asked.length);
    return [
      { kind: 'mcq', deck: 'math', label: 'Mathematics', q: `An Indian village produces ${w} kg of waste every day. ${r}% is recyclable and ${g}% is organic. The rest needs proper disposal. Which is correct?`, o: [ans].concat(wrong) },
      Object.assign({ kind: 'mcq', deck: 'science', label: 'Science' }, pick(grandScience)),
      { kind: 'judge', deck: 'english', label: 'English', input: true, time: 60, q: 'Write an environmental slogan in English about waste segregation or cleanliness.', sample: 'Example: "Segregate today for a greener tomorrow!"' },
      { kind: 'judge', deck: 'hindi', label: 'Hindi', input: true, time: 75, q: 'स्वच्छता या कचरा अलग करने पर हिंदी में एक नारा लिखिए या बोलिए।', h: 'Write or say a Hindi slogan about cleanliness or waste segregation.', sample: 'उदाहरण: “गीला-सूखा कचरा अलग करें, स्वच्छ भारत का सपना साकार करें।”' },
      Object.assign({ kind: 'mcq', deck: 'social', label: 'Social Science' }, pick(grandSocial)),
      { kind: 'rules-recall', deck: 'memory', label: 'Memory', need: asked.length, correct: asked, options: shuffle(asked.concat(others)), time: 45 },
      { kind: 'judge', deck: 'action', label: 'Creative Action', time: 90, q: 'Draw, mime or explain a plan for a sustainable village.', sample: 'Look for at least two sustainable ideas, such as waste segregation, composting, solar power, rainwater harvesting, trees or clean water.' },
    ];
  }

  function randomSubjectDeck() { return pick(SUBJECTS); }

  DR.Cards = {
    DECKS, SUBJECTS, POOLS, DHARA_RULES, MAHASHAKTI_COUNT: mahashakti.length,
    cardFrom, drawProcedural, generate, tapasyaStages, mahashaktiCard, grandStages, randomSubjectDeck,
    util: { rand, pick, shuffle, sample },
  };
})(window.DR = window.DR || {});
