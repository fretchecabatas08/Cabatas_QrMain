import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/docs/lib/auth';
import { supabase } from '@/docs/lib/supabase';

type Stat = { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; route?: string };

export default function AdminDashboard() {
const { role, user } = useAuth();

console.log('[ADMIN DEBUG]', {
  role,
  hasUser: !!user,
  email: user?.email,
});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, students: 0, teachers: 0, events: 0, attendance: 0 });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (role !== 'admin') { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [users, students, teachers, events, attendance, recent] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('id,event_code,title,start,"end",status').order('created_at', { ascending: false }).limit(4),
      ]);
      const failure = [users, students, teachers, events, attendance, recent].find((r) => r.error);
      if (failure?.error) throw failure.error;
      setStats({ users: users.count ?? 0, students: students.count ?? 0, teachers: teachers.count ?? 0, events: events.count ?? 0, attendance: attendance.count ?? 0 });
      setRecentEvents(recent.data ?? []);
    } catch (e: any) { setError(e?.message ?? 'Could not load dashboard data. Check your Supabase policies.'); }
    finally { setLoading(false); }
  }, [role]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (role !== 'admin') return <View style={s.center}><Ionicons name="lock-closed-outline" size={44} color={COLORS.primary}/><Text style={s.title}>Administrators Only</Text><Text style={s.muted}>This dashboard is available only to verified administrator accounts.</Text></View>;

  const cards: Stat[] = [
    { label: 'Total Users', value: stats.users, icon: 'people-outline', route: '/users' },
    { label: 'Students', value: stats.students, icon: 'school-outline', route: '/users' },
    { label: 'Teachers', value: stats.teachers, icon: 'person-outline', route: '/users' },
    { label: 'Events', value: stats.events, icon: 'calendar-outline', route: '/events-admin' },
    { label: 'Attendance', value: stats.attendance, icon: 'checkmark-done-outline', route: '/history' },
  ];
  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <Text style={s.pageTitle}>Admin Dashboard</Text>
    <Text style={s.subtitle}>Welcome{user?.email ? `, ${user.email}` : ''}. Manage your school attendance system.</Text>
    <View style={s.hero}>
      <Text style={s.kicker}>QR ATTENDANCE</Text><Text style={s.heroTitle}>Welcome, Administrator!</Text>
      <Text style={s.heroCopy}>Manage users, events, attendance records, and system reports in one place.</Text>
      <Pressable style={s.heroButton} onPress={() => router.push('/events-admin')}><Ionicons name="calendar-outline" size={19} color={COLORS.primaryDark}/><Text style={s.heroButtonText}>Manage Events</Text></Pressable>
    </View>
    <View style={s.sectionRow}><Text style={s.sectionTitle}>System Overview</Text><Pressable onPress={load}><Ionicons name="refresh-outline" size={22} color={COLORS.primary}/></Pressable></View>
    {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ margin: 28 }} /> : error ? <View style={s.card}><Text style={s.error}>{error}</Text><Text style={s.muted}>Check that the Admin SQL migration has been applied.</Text></View> :
      <View style={s.grid}>{cards.map((c) => <Pressable key={c.label} style={s.statCard} onPress={() => c.route && router.push(c.route as any)}><View style={s.statIcon}><Ionicons name={c.icon} size={22} color={COLORS.primaryDark}/></View><Text style={s.statValue}>{c.value}</Text><Text style={s.statLabel}>{c.label}</Text></Pressable>)}</View>}
    <View style={s.sectionRow}><Text style={s.sectionTitle}>Quick Actions</Text></View>
    <View style={s.actionList}>
      {[['people-outline','User Management','View and manage profiles','/users'],['calendar-outline','Event Management','Create, edit, and close events','/events-admin'],['clipboard-outline','Attendance History','Review or correct attendance','/history'],['bar-chart-outline','System Reports','View totals and summaries','/reports']].map(([icon,title,copy,path]) => <Pressable key={title} style={s.actionCard} onPress={() => router.push(path as any)}><View style={s.actionIcon}><Ionicons name={icon as any} size={23} color={COLORS.primaryDark}/></View><View style={{flex:1}}><Text style={s.actionTitle}>{title}</Text><Text style={s.muted}>{copy}</Text></View><Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary}/></Pressable>)}
    </View>
    <View style={s.sectionRow}><Text style={s.sectionTitle}>Recent Events</Text><Pressable onPress={() => router.push('/events-admin')}><Text style={s.link}>View all</Text></Pressable></View>
    {loading ? null : recentEvents.length === 0 ? <View style={s.card}><Text style={s.muted}>No events have been created yet.</Text></View> : recentEvents.map((ev) => <View key={ev.id} style={s.eventCard}><View style={{flex:1}}><Text style={s.actionTitle}>{ev.title}</Text><Text style={s.muted}>{ev.event_code}</Text><Text style={s.muted}>Starts: {ev.start ? new Date(ev.start).toLocaleString() : 'Not set'}</Text></View><Text style={s.status}>{ev.status ?? 'Open'}</Text></View>)}
  </ScrollView>;
}
const s = StyleSheet.create({
 screen:{flex:1,backgroundColor:COLORS.background},content:{padding:20,paddingBottom:36},center:{flex:1,backgroundColor:COLORS.background,alignItems:'center',justifyContent:'center',padding:24},pageTitle:{fontSize:27,fontWeight:'800',color:COLORS.textPrimary},title:{fontSize:23,fontWeight:'800',color:COLORS.textPrimary,marginTop:14},subtitle:{fontSize:14,color:COLORS.textSecondary,lineHeight:21,marginTop:5,marginBottom:18},hero:{backgroundColor:COLORS.primary,borderRadius:25,padding:23,marginBottom:24},kicker:{fontSize:12,fontWeight:'800',letterSpacing:2,color:'#FFFFFF'},heroTitle:{fontSize:26,fontWeight:'800',color:'#FFFFFF',marginTop:18},heroCopy:{fontSize:15,lineHeight:22,color:'#FFFFFF',marginTop:7,marginBottom:18},heroButton:{backgroundColor:'#FFFFFF',borderRadius:14,padding:14,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:9},heroButtonText:{fontSize:15,fontWeight:'700',color:COLORS.primaryDark},sectionRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:5,marginBottom:12},sectionTitle:{fontSize:20,fontWeight:'800',color:COLORS.textPrimary},grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:22},statCard:{width:'48%',flexGrow:1,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:18,padding:15},statIcon:{width:40,height:40,borderRadius:13,backgroundColor:COLORS.surface,alignItems:'center',justifyContent:'center'},statValue:{fontSize:27,fontWeight:'800',color:COLORS.textPrimary,marginTop:12},statLabel:{fontSize:13,color:COLORS.textSecondary,marginTop:3},actionList:{gap:10,marginBottom:24},actionCard:{flexDirection:'row',alignItems:'center',gap:12,padding:15,borderRadius:17,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.card},actionIcon:{width:42,height:42,borderRadius:13,backgroundColor:COLORS.surface,alignItems:'center',justifyContent:'center'},actionTitle:{fontSize:15,fontWeight:'700',color:COLORS.textPrimary,marginBottom:4},muted:{fontSize:13,color:COLORS.textSecondary,lineHeight:19},link:{color:COLORS.primaryDark,fontWeight:'700'},card:{backgroundColor:COLORS.card,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border,marginBottom:12},eventCard:{backgroundColor:COLORS.card,borderRadius:16,padding:15,borderWidth:1,borderColor:COLORS.border,marginBottom:10,flexDirection:'row',gap:10,alignItems:'center'},status:{fontSize:12,fontWeight:'700',color:COLORS.success,backgroundColor:'#E7F8EF',paddingHorizontal:10,paddingVertical:6,borderRadius:20},error:{fontSize:14,color:COLORS.danger,marginBottom:5}
});
