import {
  Activity, AlertTriangle, BadgePercent, Ban, Banknote, BarChart3, Baby, Biohazard, Bot, Briefcase, CloudLightning, Cpu, Droplets, Eye,
  Factory, FileWarning, Flag, Flame, Fuel, Gavel, Gem, Globe2, GraduationCap, Handshake, HardHat, HeartPulse, Hourglass, Landmark,
  LineChart, Megaphone, Microscope, Plane, Shield, ShieldAlert, Siren, Sun, Swords, Syringe, Tractor, TrendingDown, Trophy, Users,
  Vote, Wheat, ZapOff,
} from 'lucide-react';

export const ICONS = {
  Activity, AlertTriangle, BadgePercent, Ban, Banknote, BarChart3, Baby, Biohazard, Bot, Briefcase, CloudLightning, Cpu, Droplets, Eye,
  Factory, FileWarning, Flag, Flame, Fuel, Gavel, Gem, Globe2, GraduationCap, Handshake, HardHat, HeartPulse, Hourglass, Landmark,
  LineChart, Megaphone, Microscope, Plane, Shield, ShieldAlert, Siren, Sun, Swords, Syringe, Tractor, TrendingDown, Trophy, Users,
  Vote, Wheat, ZapOff,
};

export const getIcon = (name) => ICONS[name] ?? AlertTriangle;
