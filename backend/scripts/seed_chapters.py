"""
Seed Chapters - Populate initial chapters for CBSE and GSEB Class 6-10.

Usage:
    cd backend
    python -m scripts.seed_chapters

This creates chapters for Science, Mathematics, and Social Science for each standard.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.connection import get_db, init_db
from app.modules.chapters.schema import ChapterCreate
from app.modules.chapters.service import ChapterService


# ── Chapter Data ──────────────────────────────────────────────
# Structure: { (board, standard, subject): [(chapter_number, chapter_name, description, topics), ...] }

CBSE_CHAPTERS = {
    # ── Class 6 Science ──
    ("CBSE", "Class 6", "Science"): [
        (1, "Food: Where Does It Come From?", "Sources of food and food variety", ["food sources", "herbivores", "carnivores", "omnivores"]),
        (2, "Components of Food", "Nutrients and their importance", ["carbohydrates", "proteins", "fats", "vitamins", "minerals"]),
        (3, "Fibre to Fabric", "Natural and synthetic fibres", ["cotton", "jute", "silk", "wool", "spinning", "weaving"]),
        (4, "Sorting Materials into Groups", "Classification of materials", ["transparency", "solubility", "conductivity", "hardness"]),
        (5, "Separation of Substances", "Methods of separating mixtures", ["filtration", "sedimentation", "evaporation", "condensation"]),
        (6, "Changes Around Us", "Physical and chemical changes", ["reversible changes", "irreversible changes", "expansion", "contraction"]),
        (7, "Getting to Know Plants", "Parts of plants and their functions", ["roots", "stems", "leaves", "flowers", "photosynthesis"]),
        (8, "Body Movements", "Human skeleton and movement", ["bones", "joints", "muscles", "skeleton"]),
        (9, "The Living Organisms and Their Surroundings", "Habitats and adaptation", ["habitat", "adaptation", "biotic", "abiotic"]),
        (10, "Motion and Measurement of Distances", "Measuring length and types of motion", ["measurement", "units", "rectilinear motion", "circular motion"]),
        (11, "Light, Shadows and Reflections", "Properties of light", ["shadow", "reflection", "transparent", "opaque"]),
        (12, "Electricity and Circuits", "Electric circuits and components", ["electric cell", "bulb", "switch", "conductor", "insulator"]),
        (13, "Fun with Magnets", "Properties of magnets", ["poles", "attraction", "repulsion", "compass"]),
        (14, "Water", "Water cycle and conservation", ["evaporation", "condensation", "water cycle", "conservation"]),
        (15, "Air Around Us", "Composition and properties of air", ["oxygen", "nitrogen", "carbon dioxide", "atmosphere"]),
        (16, "Garbage In, Garbage Out", "Waste management", ["biodegradable", "non-biodegradable", "composting", "recycling"]),
    ],
    
    # ── Class 6 Mathematics ──
    ("CBSE", "Class 6", "Mathematics"): [
        (1, "Knowing Our Numbers", "Large numbers and estimation", ["place value", "comparison", "estimation", "roman numerals"]),
        (2, "Whole Numbers", "Properties of whole numbers", ["successor", "predecessor", "number line", "properties"]),
        (3, "Playing with Numbers", "Factors and multiples", ["factors", "multiples", "HCF", "LCM", "divisibility"]),
        (4, "Basic Geometrical Ideas", "Points, lines, and shapes", ["point", "line", "ray", "line segment", "angles"]),
        (5, "Understanding Elementary Shapes", "2D and 3D shapes", ["triangle", "quadrilateral", "polygon", "3D shapes"]),
        (6, "Integers", "Positive and negative numbers", ["positive integers", "negative integers", "number line", "addition"]),
        (7, "Fractions", "Understanding fractions", ["numerator", "denominator", "equivalent fractions", "comparison"]),
        (8, "Decimals", "Decimal numbers", ["decimal point", "place value", "conversion", "operations"]),
        (9, "Data Handling", "Organizing and representing data", ["pictograph", "bar graph", "tally marks"]),
        (10, "Mensuration", "Perimeter and area", ["perimeter", "area", "rectangle", "square"]),
        (11, "Algebra", "Introduction to algebra", ["variables", "expressions", "equations"]),
        (12, "Ratio and Proportion", "Comparing quantities", ["ratio", "proportion", "unitary method"]),
        (13, "Symmetry", "Line and rotational symmetry", ["line of symmetry", "reflection", "rotational symmetry"]),
        (14, "Practical Geometry", "Constructing shapes", ["compass", "ruler", "protractor", "constructions"]),
    ],
    
    # ── Class 7 Science ──
    ("CBSE", "Class 7", "Science"): [
        (1, "Nutrition in Plants", "How plants make food", ["photosynthesis", "chlorophyll", "stomata", "autotrophs"]),
        (2, "Nutrition in Animals", "Digestive system", ["digestion", "enzymes", "absorption", "egestion"]),
        (3, "Fibre to Fabric", "Wool and silk production", ["silk moth", "sheep shearing", "sericulture"]),
        (4, "Heat", "Temperature and heat transfer", ["conduction", "convection", "radiation", "thermometer"]),
        (5, "Acids, Bases and Salts", "Chemical properties", ["acids", "bases", "neutralization", "indicators"]),
        (6, "Physical and Chemical Changes", "Types of changes", ["physical change", "chemical change", "rusting", "crystallization"]),
        (7, "Weather, Climate and Adaptations", "Weather patterns", ["humidity", "rainfall", "climate zones", "adaptation"]),
        (8, "Winds, Storms and Cyclones", "Air pressure and storms", ["air pressure", "monsoon", "cyclone", "thunderstorm"]),
        (9, "Soil", "Soil profile and types", ["soil profile", "humus", "soil erosion", "soil types"]),
        (10, "Respiration in Organisms", "Breathing process", ["respiration", "lungs", "gills", "cellular respiration"]),
        (11, "Transportation in Animals and Plants", "Circulatory system", ["blood", "heart", "xylem", "phloem"]),
        (12, "Reproduction in Plants", "Plant reproduction", ["pollination", "fertilization", "seed dispersal", "vegetative propagation"]),
        (13, "Motion and Time", "Speed and simple pendulum", ["speed", "velocity", "pendulum", "time period"]),
        (14, "Electric Current and Its Effects", "Heating effects", ["heating effect", "electromagnet", "fuse", "MCB"]),
        (15, "Light", "Reflection and lenses", ["reflection", "spherical mirrors", "lenses", "spectrum"]),
        (16, "Water: A Precious Resource", "Water management", ["water table", "depletion", "conservation", "rainwater harvesting"]),
        (17, "Forests: Our Lifeline", "Forest ecosystem", ["ecosystem", "food chain", "deforestation", "conservation"]),
        (18, "Wastewater Story", "Sewage treatment", ["sewage", "treatment plant", "sludge", "effluent"]),
    ],
    
    # ── Class 8 Science ──
    ("CBSE", "Class 8", "Science"): [
        (1, "Crop Production and Management", "Agricultural practices", ["kharif crops", "rabi crops", "irrigation", "fertilizers"]),
        (2, "Microorganisms: Friend and Foe", "Types and uses of microorganisms", ["bacteria", "virus", "fungi", "vaccine"]),
        (3, "Synthetic Fibres and Plastics", "Man-made materials", ["nylon", "polyester", "plastic", "biodegradable"]),
        (4, "Materials: Metals and Non-Metals", "Properties of elements", ["malleability", "ductility", "conductivity", "reactivity"]),
        (5, "Coal and Petroleum", "Fossil fuels", ["fossil fuel", "coal", "petroleum", "natural gas"]),
        (6, "Combustion and Flame", "Burning process", ["combustion", "ignition temperature", "flame zones", "fire extinguisher"]),
        (7, "Conservation of Plants and Animals", "Biodiversity", ["deforestation", "endemic species", "wildlife sanctuary", "biosphere reserve"]),
        (8, "Cell — Structure and Functions", "Basic unit of life", ["cell membrane", "nucleus", "cytoplasm", "organelles"]),
        (9, "Reproduction in Animals", "Animal reproduction", ["sexual reproduction", "asexual reproduction", "fertilization", "metamorphosis"]),
        (10, "Reaching the Age of Adolescence", "Puberty and hormones", ["puberty", "hormones", "reproductive health", "adolescence"]),
        (11, "Force and Pressure", "Effects of force", ["force", "friction", "pressure", "atmospheric pressure"]),
        (12, "Friction", "Types and effects", ["static friction", "sliding friction", "fluid friction", "lubrication"]),
        (13, "Sound", "Production and propagation", ["vibration", "frequency", "amplitude", "pitch"]),
        (14, "Chemical Effects of Electric Current", "Electrochemistry", ["electroplating", "electrolyte", "LED", "conductivity"]),
        (15, "Some Natural Phenomena", "Lightning and earthquakes", ["lightning", "earthquake", "seismograph", "Richter scale"]),
        (16, "Light", "Reflection and human eye", ["reflection", "dispersion", "human eye", "braille"]),
        (17, "Stars and the Solar System", "Celestial bodies", ["planets", "constellation", "asteroid", "comet"]),
        (18, "Pollution of Air and Water", "Environmental issues", ["air pollution", "water pollution", "greenhouse effect", "potable water"]),
    ],
    
    # ── Class 9 Science ──
    ("CBSE", "Class 9", "Science"): [
        (1, "Matter in Our Surroundings", "States of matter", ["solid", "liquid", "gas", "plasma", "evaporation"]),
        (2, "Is Matter Around Us Pure?", "Mixtures and compounds", ["mixture", "compound", "solution", "colloid", "suspension"]),
        (3, "Atoms and Molecules", "Atomic structure", ["atom", "molecule", "atomic mass", "mole concept"]),
        (4, "Structure of the Atom", "Subatomic particles", ["electron", "proton", "neutron", "isotope", "valency"]),
        (5, "The Fundamental Unit of Life", "Cell biology", ["cell organelles", "prokaryote", "eukaryote", "cell division"]),
        (6, "Tissues", "Types of tissues", ["epithelial", "connective", "muscular", "nervous tissue"]),
        (7, "Diversity in Living Organisms", "Classification", ["taxonomy", "kingdom", "phylum", "species"]),
        (8, "Motion", "Kinematics", ["velocity", "acceleration", "equations of motion", "graphical representation"]),
        (9, "Force and Laws of Motion", "Newton's laws", ["inertia", "momentum", "action-reaction", "Newton's laws"]),
        (10, "Gravitation", "Universal gravitation", ["gravitational force", "free fall", "weight", "mass"]),
        (11, "Work and Energy", "Mechanical energy", ["work", "power", "kinetic energy", "potential energy"]),
        (12, "Sound", "Wave properties", ["longitudinal wave", "frequency", "echo", "ultrasound"]),
        (13, "Why Do We Fall Ill?", "Health and disease", ["infectious disease", "immunity", "vaccination", "antibiotic"]),
        (14, "Natural Resources", "Resource management", ["biogeochemical cycle", "water cycle", "carbon cycle", "ozone layer"]),
        (15, "Improvement in Food Resources", "Agriculture and animal husbandry", ["crop improvement", "hybridization", "animal breeding", "aquaculture"]),
    ],
    
    # ── Class 10 Science ──
    ("CBSE", "Class 10", "Science"): [
        (1, "Chemical Reactions and Equations", "Types of reactions", ["combination", "decomposition", "displacement", "redox"]),
        (2, "Acids, Bases and Salts", "pH and neutralization", ["pH scale", "indicators", "salts", "neutralization"]),
        (3, "Metals and Non-metals", "Chemical properties", ["reactivity series", "corrosion", "extraction", "alloy"]),
        (4, "Carbon and its Compounds", "Organic chemistry basics", ["covalent bond", "hydrocarbons", "functional groups", "isomers"]),
        (5, "Life Processes", "Nutrition and respiration", ["autotrophic nutrition", "respiration", "transportation", "excretion"]),
        (6, "Control and Coordination", "Nervous and hormonal systems", ["nervous system", "reflex action", "hormones", "tropic movements"]),
        (7, "How do Organisms Reproduce?", "Reproduction", ["asexual reproduction", "sexual reproduction", "puberty", "contraception"]),
        (8, "Heredity and Evolution", "Genetics", ["genes", "chromosomes", "Mendel's laws", "evolution"]),
        (9, "Light – Reflection and Refraction", "Optics", ["mirror formula", "lens formula", "refraction", "refractive index"]),
        (10, "Human Eye and Colourful World", "Vision and light", ["human eye", "defects of vision", "atmospheric refraction", "scattering"]),
        (11, "Electricity", "Current electricity", ["Ohm's law", "resistance", "power", "electric circuits"]),
        (12, "Magnetic Effects of Electric Current", "Electromagnetism", ["magnetic field", "electromagnetic induction", "generator", "motor"]),
        (13, "Our Environment", "Ecosystems", ["food chain", "food web", "ozone depletion", "waste management"]),
    ],
}

# GSEB chapters (Gujarat State Education Board) - similar structure with some variations
GSEB_CHAPTERS = {
    # ── Class 6 Science ──
    ("GSEB", "Class 6", "Science"): [
        (1, "Food: Where Does It Come From?", "Sources of food", ["food sources", "plant products", "animal products"]),
        (2, "Components of Food", "Nutrients in food", ["carbohydrates", "proteins", "fats", "vitamins"]),
        (3, "Fibre to Fabric", "Making clothes", ["cotton", "jute", "spinning", "weaving"]),
        (4, "Sorting Materials into Groups", "Properties of materials", ["transparency", "hardness", "solubility"]),
        (5, "Separation of Substances", "Separating mixtures", ["filtration", "evaporation", "sieving"]),
        (6, "Changes Around Us", "Types of changes", ["reversible", "irreversible", "physical", "chemical"]),
        (7, "Getting to Know Plants", "Plant parts", ["roots", "stem", "leaves", "flowers"]),
        (8, "Body Movements", "Human movement", ["skeleton", "joints", "muscles"]),
        (9, "Living Organisms and Surroundings", "Habitats", ["adaptation", "habitat", "biotic factors"]),
        (10, "Motion and Distance", "Measuring motion", ["distance", "speed", "types of motion"]),
        (11, "Light and Shadows", "Light properties", ["shadow", "reflection", "transparent"]),
        (12, "Electricity", "Electric circuits", ["cell", "circuit", "conductor"]),
        (13, "Magnets", "Magnetic properties", ["poles", "attraction", "compass"]),
        (14, "Water", "Water importance", ["water cycle", "conservation", "sources"]),
        (15, "Air Around Us", "Air composition", ["oxygen", "nitrogen", "atmosphere"]),
    ],
    
    # ── Class 10 Science ──
    ("GSEB", "Class 10", "Science"): [
        (1, "Chemical Reactions", "Types of chemical reactions", ["combination", "decomposition", "displacement"]),
        (2, "Acids, Bases and Salts", "pH and properties", ["pH scale", "neutralization", "salts"]),
        (3, "Metals and Non-metals", "Properties and reactions", ["reactivity", "extraction", "corrosion"]),
        (4, "Carbon Compounds", "Organic chemistry", ["hydrocarbons", "functional groups", "polymers"]),
        (5, "Life Processes", "Essential life functions", ["nutrition", "respiration", "transportation"]),
        (6, "Control and Coordination", "Nervous system", ["neurons", "hormones", "reflexes"]),
        (7, "Reproduction", "Reproductive systems", ["asexual", "sexual", "human reproduction"]),
        (8, "Heredity and Evolution", "Inheritance", ["genes", "DNA", "evolution"]),
        (9, "Light", "Optics", ["reflection", "refraction", "lenses"]),
        (10, "Human Eye", "Vision", ["eye structure", "defects", "corrections"]),
        (11, "Electricity", "Current electricity", ["Ohm's law", "circuits", "power"]),
        (12, "Magnetic Effects", "Electromagnetism", ["magnetic field", "motor", "generator"]),
        (13, "Environment", "Ecology", ["ecosystem", "food chains", "conservation"]),
    ],
}


def seed_chapters():
    """Seed chapters into the database."""
    print("🌱 Seeding chapters...")
    
    # Initialize DB connection
    init_db()
    
    all_chapters = []
    
    # Process CBSE chapters
    for (board, standard, subject), chapter_list in CBSE_CHAPTERS.items():
        for chapter_num, name, desc, topics in chapter_list:
            all_chapters.append(ChapterCreate(
                board=board,
                standard=standard,
                subject=subject,
                chapter_number=chapter_num,
                chapter_name=name,
                description=desc,
                topics=topics,
                is_active=True
            ))
    
    # Process GSEB chapters
    for (board, standard, subject), chapter_list in GSEB_CHAPTERS.items():
        for chapter_num, name, desc, topics in chapter_list:
            all_chapters.append(ChapterCreate(
                board=board,
                standard=standard,
                subject=subject,
                chapter_number=chapter_num,
                chapter_name=name,
                description=desc,
                topics=topics,
                is_active=True
            ))
    
    print(f"📚 Prepared {len(all_chapters)} chapters for seeding...")
    
    # Bulk create
    try:
        count = ChapterService.bulk_create_chapters(all_chapters)
        print(f"✅ Created {count} new chapters (skipped {len(all_chapters) - count} existing)")
    except Exception as e:
        print(f"❌ Error seeding chapters: {e}")
        return
    
    # Verify
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as count FROM chapters")
        total = cur.fetchone()["count"]
        print(f"📊 Total chapters in database: {total}")
        
        # Show breakdown
        cur.execute("""
            SELECT board, standard, subject, COUNT(*) as count
            FROM chapters
            GROUP BY board, standard, subject
            ORDER BY board, standard, subject
        """)
        print("\n📋 Chapter breakdown:")
        for row in cur.fetchall():
            print(f"   {row['board']} / {row['standard']} / {row['subject']}: {row['count']} chapters")
    finally:
        conn.close()
    
    print("\n🎉 Chapter seeding complete!")


if __name__ == "__main__":
    seed_chapters()
