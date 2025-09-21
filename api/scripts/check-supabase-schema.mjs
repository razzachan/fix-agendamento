import 'dotenv/config'
import { supabase } from '../config/supabase.js'

async function columnExists(table, column) {
  try {
    const { error } = await supabase.from(table).select(column).limit(0)
    return !error
  } catch (e) {
    return false
  }
}

async function tableExists(table) {
  try {
    const { error } = await supabase.from(table).select('id').limit(0)
    return !error
  } catch (e) {
    return false
  }
}

async function main() {
  const checks = [
    { table: 'calendar_events', columns: [
      'service_attendance_type',
      'client_cpf_cnpj',
      'client_email',
      'logistics_group',
      'is_test',
      'service_order_id'
    ]},
    { table: 'service_orders', columns: [
      'service_attendance_type',
      'scheduled_date',
      'technician_id',
      'technician_name'
    ]}
  ]

  let allOk = true
  for (const { table, columns } of checks) {
    const tExists = await tableExists(table)
    console.log(`Table ${table}: ${tExists ? 'OK' : 'MISSING'}`)
    if (!tExists) { allOk = false; continue }
    for (const col of columns) {
      const exists = await columnExists(table, col)
      console.log(`  - ${col}: ${exists ? 'OK' : 'MISSING'}`)
      if (!exists) allOk = false
    }
  }
  if (!allOk) process.exitCode = 2
}

main().catch((e)=>{ console.error(e); process.exit(1) })

