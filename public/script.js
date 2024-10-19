document.addEventListener('DOMContentLoaded', () => {
    const currentMonthElement = document.getElementById('current-month');
    let calendarDaysElement = document.getElementById('calendar-days');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const modal = document.getElementById('questionnaireModal');
    const closeModal = document.querySelector('.close');
    let isFormOpen = false;
    let date = new Date();
    let selectedDay = null;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];



    //Ensure date is formatted with padding
    function formatDateWithPadding(year, month, day) {
        return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    // Map the painType text and icons. The text should be stored in the database, while the icons are displayed to the user.

    // Map the painType text and icons. The text should be stored in the database, while the icons are displayed to the user.
    const painTypeIcon = {
        0: { text: 'no pain', icon: "😊" },
        1: { text: 'dull ache', icon: "😐" },
        2: { text: 'sharp', icon: "🔪" },
        3: { text: 'burning', icon: "🔥" },
        4: { text: 'electric', icon: "⚡" },
    };

    // Fetch the highest pain level for the date.
    async function getHighestPainLevelForDate() {
        try {
            const response = await fetch('http://localhost:3000/api/highestPainLevel');
            const data = await response.json();

            // Ensure that you return the correct structure including pain_type
            return data.map(entry => ({
                entry_date: entry.entry_date,
                highest_pain_level: entry.highest_pain_level,
                pain_type: entry.pain_type !== null ? entry.pain_type : 0 // Default to 0 if null
            }));
        } catch (error) {
            console.error('Error fetching highest pain levels:', error);
            return [];
        }
    }

    // Generates the calendar and populates it with pain data.
    async function generateCalendar() {
        const month = date.getMonth();
        const year = date.getFullYear();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        currentMonthElement.textContent = `${monthNames[month]} ${year}`;
        calendarDaysElement.innerHTML = '';

        const firstDayOfMonth = new Date(year, month, 1);
        const startDay = firstDayOfMonth.getDay();
        const highestPainLevels = await getHighestPainLevelForDate();

        // Maps for pain levels and types.
        const painLevelMap = {};
        const painTypeIconMap = {};

        // Iterate through each entry in the fetched data.
        highestPainLevels.forEach(entry => {
            const trimmedDate = entry.entry_date.trim();  // Ensure no whitespace issues
            const formattedTrimmedDate = new Date(trimmedDate).toISOString().split('T')[0];  // Ensure correct format

            painLevelMap[formattedTrimmedDate] = entry.highest_pain_level;

            // Ensure pain_type is valid and exists in painTypeIcon
            const painType = entry.pain_type; // Assuming this is now an INTEGER from your database
            if (painType !== null && painType !== undefined) {
                const painTypeInt = Number(painType); // Convert to number
                if (painTypeInt in painTypeIcon) { // Check if it's a valid pain type
                    painTypeIconMap[formattedTrimmedDate] = painTypeInt; // Store the integer
                } else {
                    console.log(`Invalid pain type value: ${painType} for date: ${formattedTrimmedDate}`);
                }
            } else {
                console.log(`Invalid pain type for date: ${formattedTrimmedDate}`);  // Optional for debugging
            }
        });

        // Create empty divs for padding (to align calendar days properly)
        for (let i = 0; i < startDay; i++) {
            calendarDaysElement.appendChild(document.createElement('div'));
        }

        // Iterate through days in the month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            const currentDate = new Date(year, month, day);
            dayDiv.textContent = day;

            const formattedDate = currentDate.toISOString().split('T')[0];  // Ensure date format matches

            // Retrieve the highest pain level and pain type for the current date.
            const highestPainLevel = painLevelMap[formattedDate];
            const painTypeIconForDate = painTypeIconMap[formattedDate];

           
            if (highestPainLevel !== undefined) {
                const painLevelText = document.createElement('span');
                painLevelText.textContent = highestPainLevel.toFixed(1);
                painLevelText.classList.add('pain-level-text');
                dayDiv.appendChild(painLevelText);

                // Check if painTypeIconForDate is valid, then add the icon.
                if (painTypeIconForDate !== undefined && painTypeIconForDate !== null) {
                    const icon = document.createElement('span');
                    // Use the icon value
                    icon.textContent = painTypeIcon[painTypeIconForDate]?.icon || ' ';
                    icon.classList.add('pain-icon');
                    dayDiv.appendChild(icon);

                    //  Optionally display the text (if needed)
                    // const painTypeText = document.createElement('span');
                    // painTypeText.textContent = painTypeIcon[painTypeIconForDate]?.text || ' ';
                    // painTypeText.classList.add('pain-type-text');
                    // dayDiv.appendChild(painTypeText);
                }
            }

            // Additional styling for future dates.
            dayDiv.classList.add('day');
            if (currentDate > today) {
                dayDiv.classList.add('disabled');
            }

            dayDiv.onclick = () => {
                const selectedDate = formatDateWithPadding(year, month, day);
                selectedDay = day;

                document.querySelectorAll('.day').forEach(dayElement => {
                    dayElement.classList.remove('selected');
                });

                openModal(day);
                fetchEntries(selectedDate);
            };

            calendarDaysElement.appendChild(dayDiv);
        }
    }



    async function loadExistingData(day) {
        try {
            const formattedDate = formatDateWithPadding(date.getFullYear(), date.getMonth(), day);
            const response = await fetch(`http://127.0.0.1:3000/api/getEntries?date=${formattedDate}`);

            if (response.ok) {
                const data = await response.json();
                if (data.length > 0) {
                    // Set the notes field
                    document.getElementById('notes').value = data[0].notes || '';

                    // Parse answers from JSON
                    const answers = JSON.parse(data[0].answers);
                 

                    // Set the pain location field
                    document.getElementById('painLocation').value = data[0].pain_location || '';
                } else {
                    console.error('No entries found for this date.');
                }
            } else {
                console.error('Error fetching data:', response.statusText);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }


    async function fetchEntries(selectedDate) {
        try {
            const response = await fetch(`http://127.0.0.1:3000/api/getEntries?date=${selectedDate}`);
            if (!response.ok) throw new Error('Network response was not ok');
           
            const entries = await response.json();
           
            const entriesBody = document.getElementById('entries-body');
            entriesBody.innerHTML = '';

            // Clear the form fields before populating new entries

            const painLocationDropdown = document.getElementById('painLocation');
            painLocationDropdown.selectedIndex = 0;

            document.getElementById('notes').value = '';


            document.querySelectorAll('input[type="radio"]:checked').forEach((radio) => {
                radio.checked = false; // Uncheck radio buttons
            });
            document.querySelectorAll('input[type="checkbox"]:checked').forEach((checkbox) => {
                checkbox.checked = false; // Uncheck checkboxes
            });


            if (entries.length === 0) {
                entriesBody.innerHTML = '<tr><td colspan="4">No entries for this date.</td></tr>';
            } else {
                entries.forEach(entry => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${entry.entry_date}</td>
                        <td>${entry.pain_location}</td>
                        <td>${entry.pain_level}</td>
                        <td>${entry.notes}</td>
                        
                            <button type="button" class="delete-btn" data-id="${entry.id}">Delete</button>
                        </tr
                    `;
                    entriesBody.appendChild(row);

                    const deleteButton = row.querySelector('.delete-btn');


                    deleteButton.onclick = async (e) => {
                        e.preventDefault();
                        const itemId = parseInt(deleteButton.getAttribute('data-id'), 10);

                        await deleteEntry(itemId, selectedDate); // Call delete function
                    };
                });
            }
        } catch (error) {
            console.error('Error fetching entries:', error);
        }
    }

    async function deleteEntry(itemId, selectedDate) {
        try {
            const response = await fetch(`http://127.0.0.1:3000/api/entries/${itemId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json(); // Capture error details
                console.error(`Error deleting entry: ${response.statusText}`, errorData);
            } else {
                console.log('Entry deleted successfully');
                await fetchEntries(selectedDate); // Refresh entries
            }
        } catch (error) {
            console.error('Error during deletion:', error);
        }
    }



    function openModal(day) {
        modal.style.display = 'block';
        selectedDay = day;
        loadExistingData(day);
    }

    closeModal.onclick = () => {
        modal.style.display = 'none';
    };


    //Handle Form Submission
    document.getElementById('painForm').onsubmit = async function (e) {
        e.preventDefault();

        // Get form values

        const intensity = parseInt(document.querySelector('input[name="intensity"]:checked')?.value) || 0;
        const frequency = parseInt(document.querySelector('input[name="frequency"]:checked')?.value) || 0;
        const concentration = parseInt(document.querySelector('input[name="concentration"]:checked')?.value) || 0;
        const impact = parseInt(document.querySelector('input[name="impact"]:checked')?.value) || 0;
        const paintype = parseInt(document.querySelector('input[name="paintype"]:checked')?.value) || 0;
        const painTypeText = painTypeIcon[paintype]?.text || 'no pain';

        //store the form values in the answers array
        const answers = [intensity, frequency, concentration, impact, paintype];

        //Calculates the pain level based on answers to the form.
        const calculatedPainLevel = answers.slice(0, 5).reduce((a, b) => a + b, 0) / 2;

        // Create the payload
        const payload = {
            entryDate: formatDateWithPadding(date.getFullYear(), date.getMonth(), selectedDay),
            painLocation: document.getElementById('painLocation').value,
            painLevel: calculatedPainLevel,
            answers,
            notes: document.getElementById('notes').value,
            paintype: paintype,
        };
        console.log('Data being sent:', payload);
        // Check value here
        try {
            const response = await fetch('http://127.0.0.1:3000/saveData', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),

            });

            if (response.ok) {
                await fetchEntries(payload.entryDate); // Refresh entries


            } else {
                console.error('Error adding entry:', response.statusText);

            }
        } catch (error) {
            console.error('Error:', error);

        }

    };




    prevMonthButton.addEventListener('click', () => {
        date.setMonth(date.getMonth() - 1);
        generateCalendar();
    });

    nextMonthButton.addEventListener('click', () => {
        date.setMonth(date.getMonth() + 1);
        generateCalendar();
    });

    currentMonthElement.addEventListener('click', (event) => {
        if (isFormOpen) return;
        const month = date.getMonth();
        const year = date.getFullYear();

        const form = document.createElement('form');
        const monthSelectElement = document.createElement('select');
        const yearSelectElement = document.createElement('select');
        const setButton = document.createElement('button');

        monthNames.forEach((name, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = name;
            if (index === month) option.selected = true;
            monthSelectElement.appendChild(option);
        });

        for (let i = 1900; i <= new Date().getFullYear(); i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === year) option.selected = true;
            yearSelectElement.appendChild(option);
        }

        setButton.textContent = 'Set';
        setButton.type = 'button';

        currentMonthElement.innerHTML = '';
        form.appendChild(monthSelectElement);
        form.appendChild(yearSelectElement);
        form.appendChild(setButton);
        currentMonthElement.appendChild(form);

        isFormOpen = true;
        event.stopPropagation();

        setButton.addEventListener('click', () => {
            const selectedMonth = parseInt(monthSelectElement.value);
            const selectedYear = parseInt(yearSelectElement.value);

            date.setMonth(selectedMonth);
            date.setFullYear(selectedYear);
            generateCalendar();

            currentMonthElement.innerHTML = `${monthNames[selectedMonth]} ${selectedYear}`;
            isFormOpen = false;
        });

        monthSelectElement.addEventListener('click', (event) => event.stopPropagation());
        yearSelectElement.addEventListener('click', (event) => event.stopPropagation());
        setButton.addEventListener('click', (event) => event.stopPropagation());
    });

    document.addEventListener('click', (event) => {
        if (isFormOpen && !currentMonthElement.contains(event.target)) {
            const month = date.getMonth();
            const year = date.getFullYear();
            currentMonthElement.innerHTML = `${monthNames[month]} ${year}`;
            isFormOpen = false;
        }
    });

    generateCalendar();
    fetchEntries(formatDateWithPadding(date.getFullYear(), date.getMonth(), date.getDate())); // Fetch today's entries by default

});
