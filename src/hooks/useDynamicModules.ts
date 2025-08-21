import { useModuleDefinitions } from './useModuleConfig';
import { useMemo } from 'react';
import { 
  Package, 
  Truck, 
  HardHat, 
  DollarSign, 
  Gamepad2, 
  BookOpen,
  Home,
  Settings,
  Users,
  FileText,
  BarChart3,
  Calendar,
  MapPin,
  Bell,
  Shield,
  Zap
} from 'lucide-react';

// Icon mapping for dynamic modules
const iconMap = {
  'Package': Package,
  'Truck': Truck,
  'HardHat': HardHat,
  'DollarSign': DollarSign,
  'Gamepad2': Gamepad2,
  'BookOpen': BookOpen,
  'Home': Home,
  'Settings': Settings,
  'Users': Users,
  'FileText': FileText,
  'BarChart3': BarChart3,
  'Calendar': Calendar,
  'MapPin': MapPin,
  'Bell': Bell,
  'Shield': Shield,
  'Zap': Zap,
};

export function useDynamicModules() {
  const { data: modules, isLoading } = useModuleDefinitions();

  const processedModules = useMemo(() => {
    if (!modules) return [];
    
    return modules
      .filter(module => module.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(module => ({
        ...module,
        icon: iconMap[module.icon as keyof typeof iconMap] || Package,
        href: `/${module.name}`,
        color: `bg-${module.name}-500` // We'll define these in tailwind config
      }));
  }, [modules]);

  return {
    modules: processedModules,
    isLoading
  };
}

export function useDynamicNavigation() {
  const { modules } = useDynamicModules();
  
  const navigation = useMemo(() => [
    { name: 'Dashboard', href: '/', icon: Home },
    ...modules.map(module => ({
      name: module.display_name,
      href: module.href,
      icon: module.icon
    }))
  ], [modules]);

  return navigation;
}