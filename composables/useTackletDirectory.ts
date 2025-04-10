export interface Tacklet {
  id: number;
  title: string;
  description: string;
  type?: string;
  iconText: string;
  iconClass: string;
  url?: string;
  icon?: string;
  permissions?: string[];
}

const isOpen = ref(false);
const tacklets = shallowRef<Tacklet[]>([
  {
    id: 1,
    title: "Tackpad Draw",
    description:
      "Unleash your creativity—doodle, sketch, and bring your ideas to life right on your board!",
    type: "Tacklet",
    iconText: "DR",
    iconClass: "pink-gradient",
    url: "http://localhost:5173",
  },
  {
    id: 2,
    title: "White Noise",
    description:
      "Block distractions and dive into deep focus with calming white noise.",
    iconText: "WN",
    iconClass: "orange-gradient",
  },
  {
    id: 3,
    title: "Napkin Math",
    description:
      "Quick, no-fuss calculations—just like scribbling on the back of a napkin.",
    iconText: "M",
    iconClass: "blue-gradient",
  },
  {
    id: 4,
    title: "Pomodoro Timer",
    description:
      "Stay productive with the Pomodoro technique—focus, break, and repeat!",
    iconText: "T",
    iconClass: "purple-gradient",
  },
]);

export default function useTackletDirectory() {
  onMounted(() => {
    fetchTacklets();
  });

  const fetchTacklets = async () => {
    try {
      // const response = await fetch('/api/tacklets');
      // const data = await response.json();
      // tacklets.value = data;
    } catch (error) {
      console.error("Error fetching tacklets:", error);
    }
  };

  const openTackletDirectory = () => {
    isOpen.value = true;
  };
  const closeTackletDirectory = () => {
    isOpen.value = false;
  };

  const toggleTackletDirectory = () => {
    isOpen.value = !isOpen.value;
  };
  return {
    isOpen,
    openTackletDirectory,
    closeTackletDirectory,
    toggleTackletDirectory,
    tacklets: tacklets,
  };
}
