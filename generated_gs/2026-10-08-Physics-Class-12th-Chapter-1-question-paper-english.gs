/**
 * SHRI CLASSES | Generated from 2026-10-08-Physics-Class-12th-Chapter-1-question-paper-english.html
 * Review the supplied answer key before publishing.
 * Run createShriClassesForm() once in Google Apps Script.
 */
function createShriClassesForm() {
  const FORM_TITLE = "SHRI CLASSES | Class 12 Test Complete Syllabus Test | 2026-10-08";
  const MARKS_PER_QUESTION = 1;
  const QUESTIONS = [
  {
    "title": "Coulomb's force is what type of force?",
    "options": [
      "Only Electric force",
      "Only Central force",
      "Both Central and Electric",
      "None of these"
    ]
  },
  {
    "title": "Statement I: Electric lines of force do not intersect. Statement II: The tangent at any point on a line of force represents the field direction.",
    "options": [
      "Both statements are correct; Statement-II explains Statement-I.",
      "Both statements are correct; Statement-II does NOT explain Statement-I.",
      "Statement-I is correct, but Statement-II is false.",
      "Statement-I is false, but Statement-II is correct."
    ]
  },
  {
    "title": "The quantum of electric charge in e.s.u. unit is:",
    "options": [
      "$4.78 \\times 10^{-10}$",
      "$+ 16 \\times 10^{-19}$",
      "$299 \\times 10^{9}$",
      "$- 16 \\times 10^{-19}$"
    ]
  },
  {
    "title": "The nature of an electrostatic field is:",
    "options": [
      "Non-conservative",
      "Destructive",
      "Mixed in nature",
      "Conservative"
    ]
  },
  {
    "title": "1 coulomb charge is equivalent to how many e.s.u.?",
    "options": [
      "$8.85 \\times 10^{-12}$",
      "$3 \\times 10^9$",
      "$9 \\times 10^9$",
      "$1.6 \\times 10^{-19}$"
    ]
  },
  {
    "title": "Which of the following is a vector quantity?",
    "options": [
      "Electric Potential",
      "Electric Intensity",
      "Electric Charge",
      "Electric Capacitance"
    ]
  },
  {
    "title": "1 statcoulomb is equal to:",
    "options": [
      "$3 \\times 10^9$ C",
      "$1/3 \\times 10^{-9}$ C",
      "$3 \\times 10^{-9}$ C",
      "$1/3 \\times 10^9$ C"
    ]
  },
  {
    "title": "Statement I: When an object is negatively charged, its mass increases slightly. Statement II: Charging is due to electron transfer.",
    "options": [
      "Both are correct; II explains I.",
      "Both are correct; II doesn't explain I.",
      "I is correct, II is incorrect.",
      "I is incorrect, II is correct."
    ]
  },
  {
    "title": "If the charge on a sphere is 10$\\mu$C, then the electric flux on its surface is:",
    "options": [
      "$36\\pi \\times 10^4 \\text{ Nm}^2 / \\text{C}$",
      "$36\\pi \\times 10^{-4} \\text{ Nm}^2 / \\text{C}$",
      "$36\\pi \\times 10^6 \\text{ Nm}^2 / \\text{C}$",
      "$36\\pi \\times 10^{-6} \\text{ Nm}^2 / \\text{C}$"
    ]
  },
  {
    "title": "The S.I. unit of electric field $\\vec{E}$ is:",
    "options": [
      "$\\text{Cm}^{-2}$",
      "$\\text{Vm}$",
      "$\\text{JC}^{-1}$",
      "$\\text{NC}^{-1}$"
    ]
  },
  {
    "title": "An electric dipole is made of two opposite charges of $\\pm 3.2 \\times 10^{-19} C$ separated by $2.4 \\times 10^{-10} m$. The dipole moment is:",
    "options": [
      "$7.68 \\times 10^{-27} \\text{ Cm}$",
      "$7.68 \\times 10^{-29} \\text{ Cm}$",
      "$7.86 \\times 10^{-29} \\text{ Cm}$",
      "$7.86 \\times 10^{-27} \\text{ Cm}$"
    ]
  },
  {
    "title": "The value of permittivity of free space ($\\epsilon_0$) is:",
    "options": [
      "$9 \\times 10^9 \\text{ Fm}^{-1}$",
      "$8.85 \\times 10^{-12} \\text{ Fm}^{-1}$",
      "$1.6 \\times 10^{-19} \\text{ Fm}^{-1}$",
      "$8.85 \\times 10^{-9} \\text{ Fm}^{-1}$"
    ]
  },
  {
    "title": "If an electric dipole of moment $\\vec{p}$ is placed in a uniform electric field $\\vec{E}$, the torque acting on it will be:",
    "options": [
      "$\\vec{p} \\cdot \\vec{E}$",
      "$pE$",
      "$\\vec{p} \\times \\vec{E}$",
      "$\\vec{p} / \\vec{E}$"
    ]
  },
  {
    "title": "The value of electric field intensity inside a charged hollow spherical conductor is:",
    "options": [
      "Zero",
      "$E_0\\sigma$",
      "$\\frac{\\sigma}{E_0}$",
      "Infinite"
    ]
  },
  {
    "title": "The electric field near an infinitely charged thin conducting sheet is:",
    "options": [
      "$\\frac{\\sigma}{2\\epsilon_0}$",
      "$\\frac{\\sigma}{\\epsilon_0}$",
      "$\\epsilon_0 \\sigma$",
      "$\\frac{1}{2} \\sigma \\epsilon_0$"
    ]
  },
  {
    "title": "The unit of surface charge density is:",
    "options": [
      "$Cm^{-1}$",
      "$Cm$",
      "$Nm^{-1}$",
      "$Cm^{-2}$"
    ]
  },
  {
    "title": "If a $+q$ charge is placed inside any closed spherical surface, the total electric flux coming out is:",
    "options": [
      "$\\frac{q}{\\epsilon_0}$",
      "$q \\times \\epsilon_0$",
      "$\\frac{\\epsilon_0}{q}$",
      "$\\frac{q^2}{\\epsilon_0}$"
    ]
  },
  {
    "title": "Which of the following is NOT accelerated by an electric field?",
    "options": [
      "Proton",
      "Neutron",
      "Alpha-particle",
      "Electron"
    ]
  },
  {
    "title": "The work done in deflecting an electric dipole by an angle $\\theta$ from the direction of uniform electric field $\\vec{E}$ is:",
    "options": [
      "$W = pE(1 - \\sin\\theta)$",
      "$W = pE(1 - \\cos\\theta)$",
      "$W = pE \\tan\\theta$",
      "$W = pE \\sec\\theta$"
    ]
  },
  {
    "title": "The relative permittivity ($\\epsilon_r$) of a medium is:",
    "options": [
      "$\\epsilon + \\epsilon_0$",
      "$\\epsilon \\times \\epsilon_0$",
      "$\\frac{\\epsilon}{\\epsilon_0}$",
      "$\\epsilon - \\epsilon_0$"
    ]
  },
  {
    "title": "The value of $\\frac{1}{4\\pi\\epsilon_0}$ is:",
    "options": [
      "$9 \\times 10^{-9} \\text{ Nm}^2\\text{C}^{-2}$",
      "$9 \\times 10^9 \\text{ Nm}^2\\text{C}^{-2}$",
      "$9 \\times 10^{12} \\text{ Nm}^2\\text{C}^{-2}$",
      "$9 \\times 10^{-12} \\text{ Nm}^2\\text{C}^{-2}$"
    ]
  },
  {
    "title": "The correct relation between electric field $\\vec{E}$ and electric force $\\vec{F}$ on a charge $q$ is:",
    "options": [
      "$\\vec{E} = \\frac{q}{\\vec{F}}$",
      "$\\vec{E} = q\\vec{F}$",
      "$\\vec{E} = \\frac{\\vec{F}}{q}$",
      "$\\vec{E} = \\frac{1}{4\\pi\\epsilon_0} \\frac{q}{\\vec{F}}$"
    ]
  },
  {
    "title": "The S.I. unit of electric dipole moment is:",
    "options": [
      "$cm^2$",
      "$cm^{-1}$",
      "$cm^{-2}$",
      "Cm"
    ]
  },
  {
    "title": "Which of the following values of $n$ is not possible in the relation $Q=ne$?",
    "options": [
      "4.2",
      "8",
      "4",
      "100"
    ]
  },
  {
    "title": "The correct value of the elementary charge on an electron is:",
    "options": [
      "$1.602 \\times 10^{-16} C$",
      "$1.602 \\times 10^{-19} C$",
      "$1.602 \\times 10^{-18} C$",
      "$1.602 \\times 10^{-17} C$"
    ]
  },
  {
    "title": "The correct vector form of Coulomb's Law is:",
    "options": [
      "$\\vec{F} = \\frac{1}{4\\pi\\epsilon_0} \\frac{q_1q_2}{|\\vec{r}|^3}$",
      "$\\vec{F} = \\frac{1}{4\\pi\\epsilon_0} \\frac{q_1q_2}{|\\vec{r}|^2} \\vec{r}$",
      "$\\vec{F} = \\frac{1}{4\\pi\\epsilon_0} \\frac{q_1q_2}{|\\vec{r}|^3} \\vec{r}$",
      "$\\vec{F} = \\frac{1}{4\\pi\\epsilon_0} \\frac{q_1q_2}{r^2} \\vec{r}$"
    ]
  },
  {
    "title": "The total electric flux coming out from a stationary unit positive charge in free space is:",
    "options": [
      "$\\epsilon_0$",
      "$4\\pi\\epsilon_0$",
      "$(4\\pi\\epsilon_0)^{-1}$",
      "$\\epsilon_0^{-1}$"
    ]
  },
  {
    "title": "Quantization of charge implies that:",
    "options": [
      "A fraction of charge on an electron is not possible",
      "A charge cannot be destroyed",
      "Charges exist only on particles",
      "Charge values can be infinite"
    ]
  },
  {
    "title": "The ratio of the electric force and gravitational force acting between an electron and a proton is in the order of:",
    "options": [
      "$10^{42}$",
      "$10^{36}$",
      "$10^{39}$",
      "1"
    ]
  },
  {
    "title": "A charge 'q' is placed at the center of the line joining two equal charges 'Q'. For the system to be in equilibrium, 'q' must be:",
    "options": [
      "$-\\frac{Q}{2}$",
      "$-4Q$",
      "$+\\frac{Q}{4}$",
      "$-\\frac{Q}{4}$"
    ]
  },
  {
    "title": "For an electric dipole to be in stable equilibrium in a uniform electric field, the angle between $\\vec{P}$ and $\\vec{E}$ should be:",
    "options": [
      "$0^\\circ$",
      "$90^\\circ$",
      "$180^\\circ$",
      "$45^\\circ$"
    ]
  },
  {
    "title": "The number of electrons present in 8 Coulomb of negative charge is:",
    "options": [
      "$12.8 \\times 10^{19}$",
      "$5 \\times 10^{19}$",
      "$2.5 \\times 10^{19}$",
      "$1.6 \\times 10^{19}$"
    ]
  },
  {
    "title": "The electric field at the center of a solid charged conducting sphere is:",
    "options": [
      "Maximum",
      "Zero",
      "Minimum",
      "Infinite"
    ]
  },
  {
    "title": "Two equal and opposite charges of 5 C are placed 5.0 cm apart. The electric dipole moment of the system is:",
    "options": [
      "$5 \\times 10^{-2} \\text{ Cm}$",
      "1 Cm",
      "$25 \\times 10^{-2} \\text{ Cm}$",
      "Zero"
    ]
  },
  {
    "title": "Equal charges are placed at three corners of a square. If force between adjacent charges is $F_{12}$ and diagonal is $F_{13}$, then $\\frac{F_{12}}{F_{13}}$ is:",
    "options": [
      "2",
      "$1/2$",
      "$\\sqrt{2}$",
      "$1/\\sqrt{2}$"
    ]
  },
  {
    "title": "When $10^{14}$ electrons are removed from a neutral metallic sphere, the charge on the sphere becomes:",
    "options": [
      "$-16 \\mu C$",
      "$32 \\mu C$",
      "$-32 \\mu C$",
      "$+16 \\mu C$"
    ]
  },
  {
    "title": "The dimensional formula of electric flux is:",
    "options": [
      "$[ML^3T^{-3}A^{-1}]$",
      "$[ML^2T^{-3}A^{-1}]$",
      "$[ML^2T^{-2}A^{-2}]$",
      "$[ML^3T^{-2}A^{-1}]$"
    ]
  },
  {
    "title": "The charging of a body is primarily due to the transfer of:",
    "options": [
      "Protons",
      "Electrons",
      "Neutrons",
      "Positrons"
    ]
  },
  {
    "title": "If the distance between two point charges is doubled, the electrostatic force acting between them becomes:",
    "options": [
      "2 times",
      "4 times",
      "1/4 times",
      "1/2 times"
    ]
  },
  {
    "title": "The electric field near a uniformly charged infinite plane non-conducting sheet is:",
    "options": [
      "$\\sigma / \\epsilon_0$",
      "$2\\sigma / \\epsilon_0$",
      "$\\sigma / 2\\epsilon_0$",
      "Zero"
    ]
  },
  {
    "title": "Gauss's law is applicable for determining electric flux over:",
    "options": [
      "Open surfaces",
      "Point charges only",
      "Spherical surfaces only",
      "Closed surfaces"
    ]
  },
  {
    "title": "When charge is given to a solid non-conducting sphere, it:",
    "options": [
      "Spreads entirely on the surface",
      "Stays exactly where it was placed",
      "Resides only deep inside",
      "Resides uniformly inside and on the surface"
    ]
  },
  {
    "title": "A stationary electric charge produces:",
    "options": [
      "Only a magnetic field",
      "Only an electric field",
      "Both fields",
      "Neither fields"
    ]
  },
  {
    "title": "The ratio of the magnitude of electric field due to a short dipole at equal distances in the axial to the equatorial positions is:",
    "options": [
      "1:2",
      "1:1",
      "2:1",
      "4:1"
    ]
  },
  {
    "title": "The direction of the electric field on the equatorial line of an electric dipole with respect to its dipole moment vector is:",
    "options": [
      "Same",
      "Opposite",
      "Perpendicular",
      "At an angle of $45^\\circ$"
    ]
  },
  {
    "title": "1 Volt/meter is equivalent to which of the following units?",
    "options": [
      "1 J/C",
      "1 V/C",
      "1 N/C",
      "1 C/N"
    ]
  },
  {
    "title": "If a dielectric medium of constant $K$ is placed between two charges, the electrostatic force between them compared to vacuum:",
    "options": [
      "Becomes $K$ times",
      "Becomes $1/K$ times",
      "Becomes $K^2$ times",
      "Remains unchanged"
    ]
  },
  {
    "title": "A charge $q$ is placed exactly at the center of a cube. The electric flux coming out through any ONE face of the cube will be:",
    "options": [
      "$q / \\epsilon_0$",
      "$q / 2\\epsilon_0$",
      "$q / 6\\epsilon_0$",
      "$q / 4\\epsilon_0$"
    ]
  },
  {
    "title": "A proton and an electron are placed in a uniform electric field. Which of the following statements is true regarding the forces acting on them?",
    "options": [
      "Their directions will be the same",
      "Their magnitudes will be exactly equal",
      "Their accelerations will be exactly equal",
      "Their magnitudes will be completely different"
    ]
  },
  {
    "title": "The electric field at a point due to an infinitely long straight uniformly charged wire is proportional to:",
    "options": [
      "$1/r^2$",
      "$r$",
      "$1/r$",
      "$1/r^3$"
    ]
  },
  {
    "title": "An electric dipole placed in a non-uniform electric field will generally experience:",
    "options": [
      "Only a net force",
      "Both a net force and a torque",
      "Only a torque",
      "Neither a force nor a torque"
    ]
  },
  {
    "title": "1 micro-coulomb ($1 \\mu C$) is equal to:",
    "options": [
      "$10^{-6} C$",
      "$10^{-3} C$",
      "$10^{-9} C$",
      "$10^{-12} C$"
    ]
  },
  {
    "title": "Two like charges naturally do what to each other?",
    "options": [
      "Attract",
      "Apply no force",
      "Repel",
      "Destroy"
    ]
  },
  {
    "title": "When a glass rod is rubbed with silk, the glass rod loses electrons and becomes:",
    "options": [
      "Negatively charged",
      "Positively charged",
      "Neutral",
      "Both pos and neg"
    ]
  },
  {
    "title": "Which of the following charge values is not possible on a body?",
    "options": [
      "$3.2 \\times 10^{-19} C$",
      "$6.4 \\times 10^{-19} C$",
      "$1.6 \\times 10^{-19} C$",
      "$2.4 \\times 10^{-19} C$"
    ]
  },
  {
    "title": "At what angle do two electric field lines intersect each other?",
    "options": [
      "$90^\\circ$",
      "$45^\\circ$",
      "They never intersect",
      "$30^\\circ$"
    ]
  },
  {
    "title": "When two charged conductors are connected by a wire, charge will not flow between them if:",
    "options": [
      "Their capacitances are equal",
      "Their electrostatic potentials are equal",
      "Their total charges are equal",
      "Their physical sizes are equal"
    ]
  },
  {
    "title": "Electric field lines on the surface of a charged conductor are always:",
    "options": [
      "Perpendicular to the surface",
      "Parallel to the surface",
      "At $45^\\circ$ to the surface",
      "In any random direction"
    ]
  },
  {
    "title": "The electric field ($E$) due to a short electric dipole at a distance $r$ is proportional to:",
    "options": [
      "$1/r$",
      "$1/r^2$",
      "$1/r^3$",
      "$r^2$"
    ]
  },
  {
    "title": "When an electron is brought closer to another electron, the electrostatic potential energy:",
    "options": [
      "Decreases",
      "Becomes zero",
      "Remains unchanged",
      "Increases"
    ]
  },
  {
    "title": "The total electric flux over a closed surface in vacuum is what times the total net charge enclosed within it?",
    "options": [
      "$1/\\epsilon_0$ times",
      "$\\epsilon_0$ times",
      "$4\\pi\\epsilon_0$ times",
      "$1/4\\pi\\epsilon_0$ times"
    ]
  },
  {
    "title": "The conventional direction of the electric dipole moment ($\\vec{p}$) is:",
    "options": [
      "From positive charge to negative charge",
      "Perpendicular to the electric field axis",
      "Not fixed in any frame",
      "From negative charge to positive charge"
    ]
  },
  {
    "title": "The dimensional formula of electric charge is:",
    "options": [
      "$[AT]$",
      "$[AT^{-1}]$",
      "$[A^{-1}T]$",
      "$[AT^2]$"
    ]
  },
  {
    "title": "The absolute value of the elementary charge ($e$) is:",
    "options": [
      "$9.1 \\times 10^{-31} C$",
      "$1.6 \\times 10^{-19} C$",
      "$1.6 \\times 10^{-27} C$",
      "$8.85 \\times 10^{-12} C$"
    ]
  },
  {
    "title": "The intensity of the electric field just outside the surface of a charged conductor is:",
    "options": [
      "Zero",
      "Tangential to the surface",
      "Perpendicular to the surface",
      "At an angle of $45^\\circ$"
    ]
  },
  {
    "title": "If a dielectric medium is introduced between two point charges, the electrostatic force:",
    "options": [
      "Increases",
      "Decreases",
      "Remains completely unchanged",
      "Automatically becomes zero"
    ]
  },
  {
    "title": "The potential energy of an electric dipole in an external uniform electric field is minimum when the angle between $\\vec{p}$ and $\\vec{E}$ is:",
    "options": [
      "$90^\\circ$",
      "$180^\\circ$",
      "$0^\\circ$",
      "$270^\\circ$"
    ]
  },
  {
    "title": "How does the electric field $E$ due to an infinite non-conducting plane sheet of charge depend on the distance $r$?",
    "options": [
      "Directly proportional to $r$",
      "Inversely proportional to $r^2$",
      "Inversely proportional to $r$",
      "Independent of distance $r$"
    ]
  },
  {
    "title": "When a soap bubble is given a negative charge, its radius:",
    "options": [
      "Decreases",
      "Remains unchanged",
      "Becomes zero",
      "Increases"
    ]
  },
  {
    "title": "The value of dielectric constant ($K$) for metallic conductors is:",
    "options": [
      "0",
      "Infinity ($\\infty$)",
      "1",
      "-1"
    ]
  },
  {
    "title": "The number of extra electrons on a body required to give it a net charge of -1 Coulomb is:",
    "options": [
      "$1.6 \\times 10^{-19}$",
      "$6.25 \\times 10^{19}$",
      "$6.25 \\times 10^{18}$",
      "$1.6 \\times 10^{19}$"
    ]
  },
  {
    "title": "The torque on a dipole placed in a uniform electric field is maximum when the angle is:",
    "options": [
      "$0^\\circ$",
      "$90^\\circ$",
      "$45^\\circ$",
      "$180^\\circ$"
    ]
  },
  {
    "title": "In Coulomb's law, the value of the constant $k = 1 / (4\\pi\\epsilon_0)$ depends on:",
    "options": [
      "Only the nature of the intervening medium",
      "Only the system of units adopted",
      "Neither the medium nor the units",
      "Both the nature of the medium and the system of units"
    ]
  },
  {
    "title": "The principle of conservation of charge implies that:",
    "options": [
      "The total charge of the universe is always zero",
      "The total net charge of an isolated system remains constant",
      "Electric charge can only be destroyed",
      "Electric charge can only be created"
    ]
  },
  {
    "title": "The work done in moving a test charge from one point to another on an equipotential surface is:",
    "options": [
      "Positive",
      "Negative",
      "Zero",
      "Infinite"
    ]
  },
  {
    "title": "When a charged particle is released from rest in a uniform electric field, its kinetic energy:",
    "options": [
      "Decreases continually",
      "Remains constant",
      "Becomes zero",
      "Increases continually"
    ]
  },
  {
    "title": "Gauss's law in electrostatics is valid only if the electrostatic force is inversely proportional to which power of distance $r$?",
    "options": [
      "$r^3$",
      "$r^2$",
      "$r$",
      "$r^{-2}$"
    ]
  },
  {
    "title": "The electric field inside a hollow conducting sphere is exactly zero. This phenomenon is commonly known as:",
    "options": [
      "Electrostatic shielding",
      "Dielectric Polarization",
      "Dielectric breakdown",
      "Electromagnetic Induction"
    ]
  },
  {
    "title": "If the product $q_1 q_2 > 0$, the nature of the electrostatic force between the two charges will be:",
    "options": [
      "Attractive",
      "Zero",
      "Repulsive",
      "Cannot be determined"
    ]
  },
  {
    "title": "If the product $q_1 q_2 < 0$, the nature of the electrostatic force between the two charges will be:",
    "options": [
      "Repulsive",
      "Attractive",
      "Zero",
      "Cannot be determined"
    ]
  },
  {
    "title": "Electric field lines start from which charge and end on which charge?",
    "options": [
      "From negative to positive",
      "From infinity to positive",
      "From positive to negative",
      "They form continuous closed loops"
    ]
  },
  {
    "title": "Two electric field lines can never intersect each other primarily because:",
    "options": [
      "Field lines are just imaginary paths",
      "At intersection, there would be two directions of electric field",
      "They constantly repel each other",
      "They are always parallel to each other"
    ]
  },
  {
    "title": "The ratio of electric potential (V) to electric field (E) at a distance $r$ from a point charge $q$ is:",
    "options": [
      "$1/r$",
      "$r^2$",
      "$r$",
      "$1/r^2$"
    ]
  },
  {
    "title": "Electron volt (eV) is a practical unit of:",
    "options": [
      "Electric Charge",
      "Electric Potential",
      "Electric Current",
      "Energy"
    ]
  },
  {
    "title": "An electron placed in a uniform electric field will experience an electrostatic force in which direction?",
    "options": [
      "Perpendicular to the field",
      "In the direction of the field",
      "Opposite to the direction of the field",
      "At an angle of $45^\\circ$"
    ]
  },
  {
    "title": "The net electrostatic force on an electric dipole placed in a uniform electric field is always:",
    "options": [
      "Zero",
      "$pE$",
      "$2qE$",
      "$qE$"
    ]
  },
  {
    "title": "The amount of charge on any body is always an integer multiple of which fundamental value?",
    "options": [
      "$3.2 \\times 10^{-19} C$",
      "$1.6 \\times 10^{-19} C$",
      "$9.1 \\times 10^{-31} C$",
      "1 Coulomb"
    ]
  },
  {
    "title": "The direction of the electrostatic force between two point charges is always:",
    "options": [
      "In any random orientation",
      "Perpendicular to the line joining them",
      "Along the line joining them",
      "Tangential to their surfaces"
    ]
  },
  {
    "title": "The dielectric strength of normal dry air is approximately:",
    "options": [
      "$3 \\times 10^6 \\text{ Vm}^{-1}$",
      "$3 \\times 10^8 \\text{ Vm}^{-1}$",
      "$1 \\times 10^6 \\text{ Vm}^{-1}$",
      "$9 \\times 10^9 \\text{ Vm}^{-1}$"
    ]
  },
  {
    "title": "Electric flux is which type of physical quantity?",
    "options": [
      "Vector",
      "Scalar",
      "Tensor",
      "None"
    ]
  },
  {
    "title": "If the total electric flux coming out of a closed surface is zero, it definitively implies that:",
    "options": [
      "There is no net charge enclosed by the surface",
      "There is only positive charge inside",
      "There is only negative charge inside",
      "There is absolutely no charge outside the surface"
    ]
  },
  {
    "title": "The net electric charge on an alpha particle ($\\alpha$-particle) is:",
    "options": [
      "$-1.6 \\times 10^{-19} C$",
      "$+1.6 \\times 10^{-19} C$",
      "$+3.2 \\times 10^{-19} C$",
      "Zero"
    ]
  },
  {
    "title": "The total electric charge on a neutron is:",
    "options": [
      "$+1.6 \\times 10^{-19} C$",
      "Zero",
      "$-1.6 \\times 10^{-19} C$",
      "$+3.2 \\times 10^{-19} C$"
    ]
  },
  {
    "title": "A charged particle of mass $m$ and charge $q$ is placed in a uniform electric field $E$. Its acceleration will be:",
    "options": [
      "$mE/q$",
      "$q/mE$",
      "$qE/m$",
      "$m/qE$"
    ]
  },
  {
    "title": "The total electric flux passing through a closed spherical surface enclosing an electric dipole is:",
    "options": [
      "$q/\\epsilon_0$",
      "$2q/\\epsilon_0$",
      "Infinite",
      "Zero"
    ]
  },
  {
    "title": "The surface charge density at the sharp points of an irregularly shaped charged conductor is:",
    "options": [
      "Maximum",
      "Minimum",
      "Zero",
      "Uniform"
    ]
  },
  {
    "title": "The absolute value of 1 nanocoulomb (1 nC) is:",
    "options": [
      "$10^{-6} C$",
      "$10^{-9} C$",
      "$10^{-12} C$",
      "$10^{-3} C$"
    ]
  },
  {
    "title": "If 3 separate electric dipoles are placed inside a closed surface, the total electric flux coming out of the surface will be:",
    "options": [
      "$3q/\\epsilon_0$",
      "$6q/\\epsilon_0$",
      "Zero",
      "$q/\\epsilon_0$"
    ]
  },
  {
    "title": "The electric field exactly at the center of a uniformly charged thin spherical shell is:",
    "options": [
      "$\\sigma/\\epsilon_0$",
      "Infinite",
      "$q/4\\pi\\epsilon_0 R^2$",
      "Zero"
    ]
  },
  {
    "title": "When a proton is brought closer to another proton, the electrostatic potential energy of the system:",
    "options": [
      "Becomes exactly zero",
      "Decreases",
      "Increases",
      "Remains unchanged"
    ]
  }
];
  const ANSWER_KEY = [
  "C",
  "A",
  "A",
  "D",
  "B",
  "B",
  "B",
  "A",
  "A",
  "D",
  "B",
  "B",
  "C",
  "A",
  "B",
  "D",
  "A",
  "B",
  "B",
  "C",
  "B",
  "C",
  "D",
  "A",
  "B",
  "C",
  "D",
  "A",
  "C",
  "D",
  "A",
  "B",
  "B",
  "C",
  "A",
  "D",
  "A",
  "B",
  "C",
  "C",
  "D",
  "B",
  "B",
  "C",
  "B",
  "C",
  "B",
  "C",
  "B",
  "C",
  "B",
  "A",
  "C",
  "B",
  "D",
  "C",
  "B",
  "A",
  "C",
  "D",
  "A",
  "D",
  "A",
  "B",
  "C",
  "B",
  "C",
  "D",
  "D",
  "B",
  "C",
  "B",
  "D",
  "B",
  "C",
  "D",
  "B",
  "A",
  "C",
  "B",
  "C",
  "B",
  "C",
  "D",
  "C",
  "A",
  "B",
  "C",
  "A",
  "B",
  "A",
  "C",
  "B",
  "C",
  "D",
  "A",
  "C",
  "C",
  "D",
  "C"
];

  if (QUESTIONS.length !== ANSWER_KEY.length) {
    throw new Error("Question/key count mismatch. Form not created.");
  }

  QUESTIONS.forEach((q, index) => {
    if (!q.title || !Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error("Invalid question/options at question " + (index + 1));
    }
    if (!["A", "B", "C", "D"].includes(ANSWER_KEY[index])) {
      throw new Error("Invalid answer key at question " + (index + 1));
    }
  });

  const form = FormApp.create(FORM_TITLE);
  form.setDescription(
    "SHRI CLASSES\n2026-10-08 | " + QUESTIONS.length +
    " MCQs\\nEach question carries 1 mark. Questions are optional."
  );
  form.setIsQuiz(true);
  form.setShuffleQuestions(true);

  form.addSectionHeaderItem().setTitle("Student Details")
    .setHelpText("Please fill in all details.");
  form.addTextItem().setTitle("Student Name").setRequired(true);
  form.addTextItem().setTitle("Father's Name").setRequired(true);
  form.addTextItem().setTitle("Mother's Name").setRequired(true);
  form.addTextItem().setTitle("School Name").setRequired(true);
  form.addParagraphTextItem().setTitle("Address")
    .setHelpText("Village, town, locality, or full address")
    .setRequired(true);

  form.addPageBreakItem().setTitle("MCQ Test")
    .setHelpText("Each question carries 1 mark. Questions are optional.");

  QUESTIONS.forEach((q, index) => {
    if (index > 0 && index % 12 === 0) {
      form.addPageBreakItem().setTitle("MCQ Test · Continued");
    }
    const item = form.addMultipleChoiceItem();
    const correctIndex = ["A", "B", "C", "D"].indexOf(ANSWER_KEY[index]);
    const choices = q.options.map((option, optionIndex) =>
      item.createChoice(option, optionIndex === correctIndex)
    );
    item.setTitle(q.title).setChoices(choices)
      .setRequired(false).setPoints(MARKS_PER_QUESTION);
  });

  Logger.log("FORM CREATED");
  Logger.log("Edit URL: " + form.getEditUrl());
  Logger.log("Student URL: " + form.getPublishedUrl());
  Logger.log("Question count: " + QUESTIONS.length);
  Logger.log("Question shuffling: enabled");
}
