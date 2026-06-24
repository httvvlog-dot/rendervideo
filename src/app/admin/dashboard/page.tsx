"use client"

import { motion } from "framer-motion"
import { Users, FolderKanban, Activity, CreditCard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const stats = [
  { title: "Total Users", value: "1,240", icon: Users, change: "+12% from last month" },
  { title: "Active Projects", value: "342", icon: FolderKanban, change: "+4% from last month" },
  { title: "Videos Rendered", value: "8,921", icon: Activity, change: "+24% from last month" },
  { title: "Total Revenue", value: "$42,500", icon: CreditCard, change: "+18% from last month" },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground mt-2">
          Monitor your platform's performance and usage metrics.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="grid gap-6 md:grid-cols-2"
      >
        <Card className="col-span-1 min-h-[300px]">
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              User list placeholder
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 min-h-[300px]">
          <CardHeader>
            <CardTitle>Recent Renders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              Render queue placeholder
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
