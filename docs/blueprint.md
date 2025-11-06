# **App Name**: Steel Gantt Vision

## Core Features:

- Excel Data Import: Import steelmaking schedule data from Excel files (.xlsx, .xls).
- Data Validation: Validate the data for consistency, completeness, and process flow rules (e.g., BOF must precede LF).
- Gantt Chart Generation: Generate interactive Gantt charts visualizing the steelmaking process schedule.
- Firestore Storage: Store the validated steelmaking schedule data and Gantt chart configurations in Firestore.
- Error Reporting: Display validation errors and warnings to the user in a clear, actionable format.
- Dynamic Time Prediction: AI tool for estimating operation duration by analyzing historical data from stored Firestore records.
- Heat Grouping and Filtering: Allows users to filter data and generate Gantt charts for specific heat IDs, facilitating detailed analysis and monitoring.

## Style Guidelines:

- Primary color: Steel blue (#4682B4) to reflect the steelmaking theme.
- Background color: Light gray (#F0F0F0), offering a subtle backdrop to highlight the data and Gantt chart.
- Accent color: Gold (#FFD700) to draw attention to important elements such as critical tasks or alerts.
- Body font: 'Inter' sans-serif for clear data presentation, aided by its clean and legible style.
- Headline font: 'Space Grotesk' sans-serif, ensuring headlines possess a tech-inspired and scientific appeal that resonates with the data-driven nature of steelmaking.
- Use clear and concise icons to represent different stages or units in the steelmaking process.
- Implement a split-screen layout with data input and validation results on the left and the Gantt chart on the right.
- Use smooth transitions and animations when updating the Gantt chart or displaying new data.