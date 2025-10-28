Make the following component in your components for reusuability of use it in myProjects.jsx only
```
const TickCrossIndicator = ({ checked, label }) => (

<div style={{ display: "flex", alignItems: "center", gap: "0.3em" }}> 
  <span style={{ color: checked ? "green" : "red", fontWeight: "bold", fontSize: "1.2em", userSelect: "none", }}
        aria-label={checked ? "Checked" : "Not checked"} role="img" > {checked ? "✔" : "✖"} </span> 
  <span>{label}</span> </div> );
````
// Usage example:

```
<Section> <TickCrossIndicator checked={inShift} label="In Shift" />
<TickCrossIndicator checked={inTrips} label="In Trips" /></Section>
<Section> <TickCrossIndicator checked={inTimes} label="In Times" />
<TickCrossIndicator checked={inExpenses} label="In Expenses" /> </Section>
```
